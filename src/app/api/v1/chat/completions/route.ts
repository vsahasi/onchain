import { NextRequest, NextResponse } from "next/server";
import { hashApiKey } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/supabase";
import { routeToUpstream, ChatMessage } from "@/lib/gateway/router";
import { calculateCreditCost } from "@/lib/gateway/metering";
import { burnCredits } from "@/lib/xrpl/tokens";

/**
 * POST /api/v1/chat/completions
 * OpenAI-compatible endpoint. Auth via Bearer <api-key>.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawKey = auth.slice(7);
  const keyHash = hashApiKey(rawKey);

  const db = getServiceClient();

  // Resolve API key → user
  const { data: apiKey } = await db
    .from("api_keys")
    .select("id, user_id, is_active")
    .eq("key_hash", keyHash)
    .single();

  if (!apiKey?.is_active) {
    return NextResponse.json({ error: "invalid or inactive API key" }, { status: 401 });
  }

  const { data: user } = await db
    .from("users")
    .select("id, wallet_address")
    .eq("id", apiKey.user_id)
    .single();

  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Get custodial balance
  const { data: txns } = await db
    .from("credit_transactions")
    .select("tx_type, amount")
    .eq("user_id", user.id);

  let balance = 0;
  for (const tx of txns ?? []) {
    const amt = parseFloat(tx.amount);
    if (tx.tx_type === "deposit" || tx.tx_type === "purchase") balance += amt;
    else if (tx.tx_type === "burn" || tx.tx_type === "sale") balance -= amt;
  }

  if (balance < 1) {
    return NextResponse.json({ error: "insufficient credits" }, { status: 402 });
  }

  // Parse request body
  const body = await req.json();
  const { model = "gpt-4o-mini", messages } = body as {
    model: string;
    messages: ChatMessage[];
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  // Forward to upstream
  let result;
  try {
    result = await routeToUpstream(model, messages);
  } catch (err: any) {
    return NextResponse.json({ error: `upstream error: ${err.message}` }, { status: 502 });
  }

  const { prompt_tokens, completion_tokens } = result.usage;
  const creditsUsed = calculateCreditCost(model, prompt_tokens, completion_tokens);

  // Burn credits (custodial: update DB; XRPL burn runs async)
  await db.from("credit_transactions").insert({
    user_id: user.id,
    tx_type: "burn",
    amount: creditsUsed.toString(),
    xrpl_tx_hash: "",
  });

  // Log usage
  await db.from("usage_logs").insert({
    user_id: user.id,
    api_key_id: apiKey.id,
    model,
    prompt_tokens,
    completion_tokens,
    credits_used: creditsUsed,
    upstream_provider: "openai",
  });

  // Async XRPL burn (fire and forget for latency)
  burnCredits(user.wallet_address, creditsUsed.toString()).catch(console.error);

  return NextResponse.json(result);
}
