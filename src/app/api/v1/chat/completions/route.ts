import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";
import { routeRequest } from "@/lib/gateway/router";
import { calculateCreditCost } from "@/lib/gateway/metering";
import { getCreditBalance, issueCredits } from "@/lib/xrpl/tokens";
import { getPlatformWallet, getCreditCurrency } from "@/lib/xrpl/client";
import { getXrplClient } from "@/lib/xrpl/client";
import { v4 as uuidv4 } from "uuid";

async function resolveUser(apiKey: string) {
  const db = getSupabase();
  const keyHash = hashApiKey(apiKey);

  const { data: keyRecord } = await db
    .from("api_keys")
    .select("*, users(*)")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (!keyRecord) return null;

  await db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return {
    user: keyRecord.users,
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

    const { user, apiKeyId } = resolved;
    const walletAddress = user.wallet_address;

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

    const balance = await getCreditBalance(walletAddress);
    const infxBalance = parseFloat(balance.infx);

    if (infxBalance <= 0) {
      return NextResponse.json(
        {
          error: {
            message: "Insufficient IFX credits. Deposit RLUSD or purchase credits on the marketplace.",
            type: "insufficient_credits",
            balance: balance.infx,
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
        const client = await getXrplClient();
        const platformWallet = getPlatformWallet();
        const currency = getCreditCurrency();

        const burnPayment = {
          TransactionType: "Payment" as const,
          Account: platformWallet.classicAddress,
          Destination: platformWallet.classicAddress,
          Amount: {
            currency,
            issuer: platformWallet.classicAddress,
            value: creditCost.toString(),
          },
          SendMax: {
            currency,
            issuer: platformWallet.classicAddress,
            value: creditCost.toString(),
          },
        };

        // In production, this would be a clawback or authorized debit.
        // For the MVP, we track the burn in our database and periodically settle.
        const db = getSupabase();
        await db.from("credit_transactions").insert({
          user_id: user.id,
          tx_type: "burn",
          amount: creditCost,
          xrpl_tx_hash: null,
        });

        await db.from("usage_logs").insert({
          user_id: user.id,
          api_key_id: apiKeyId,
          model,
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens,
          credits_used: creditCost,
          upstream_provider: result.upstreamProvider,
        });
      } catch (burnErr) {
        console.error("Credit burn logging error:", burnErr);
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
