import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";
import { routeRequest } from "@/lib/gateway/router";
import { calculateCreditCost } from "@/lib/gateway/metering";
import { getEffectiveBalance } from "@/lib/xrpl/tokens";
import { v4 as uuidv4 } from "uuid";

async function resolveUser(apiKey: string) {
  const db = getSupabase();
  const keyHash = hashApiKey(apiKey);

  const { data: keyRecord } = await db
    .from("api_keys")
    .select("*, users(*), seller:source_user_id(id, wallet_address)")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (!keyRecord) return null;

  // The user whose credits get billed: seller if this is a marketplace key, otherwise key owner
  const billedUser = keyRecord.seller ?? keyRecord.users;

  return {
    user: keyRecord.users,
    billedUser,
    apiKeyId: keyRecord.id,
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { message: "Missing API key", type: "auth_error" } },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const resolved = await resolveUser(apiKey);

    if (!resolved) {
      return NextResponse.json(
        { error: { message: "Invalid API key", type: "auth_error" } },
        { status: 401 }
      );
    }

    const { user, billedUser, apiKeyId } = resolved;

    const body = await req.json();
    const { model = "gpt-4o-mini", messages, temperature, max_tokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          error: {
            message: "messages is required and must be an array",
            type: "invalid_request_error",
          },
        },
        { status: 400 }
      );
    }

    const balance = await getEffectiveBalance(billedUser.wallet_address, billedUser.id);

    if (balance.effective_infx <= 0) {
      return NextResponse.json(
        {
          error: {
            message: "Insufficient IFX credits. The seller's credit pool is empty.",
            type: "insufficient_credits",
            balance: balance.effective_infx.toString(),
          },
        },
        { status: 402 }
      );
    }

    const result = await routeRequest(model, messages, temperature, max_tokens);

    const creditCost = calculateCreditCost(
      model,
      result.usage.prompt_tokens,
      result.usage.completion_tokens
    );

    if (creditCost > 0) {
      try {
        const db = getSupabase();
        // Debit the billed user (seller for marketplace keys, buyer for own keys)
        await db.from("credit_transactions").insert({
          user_id: billedUser.id,
          tx_type: "burn",
          amount: creditCost.toString(),
          xrpl_tx_hash: "",
        });

        await db.from("usage_logs").insert({
          user_id: billedUser.id,
          api_key_id: apiKeyId,
          model,
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens,
          credits_used: creditCost,
          upstream_provider: result.upstreamProvider,
        });
      } catch (dbErr) {
        console.error("Usage logging error:", dbErr);
      }
    }

    return NextResponse.json({
      id: result.id || `chatcmpl-${uuidv4()}`,
      object: "chat.completion",
      created: result.created || Math.floor(Date.now() / 1000),
      model: result.model,
      choices: result.choices,
      usage: {
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        total_tokens: result.usage.total_tokens,
        credits_used: creditCost,
      },
    });
  } catch (err) {
    console.error("Gateway error:", err);
    return NextResponse.json(
      {
        error: {
          message: "Internal server error",
          type: "server_error",
        },
      },
      { status: 500 }
    );
  }
}
