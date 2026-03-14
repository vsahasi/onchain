import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/supabase";
import { issueCredits } from "@/lib/xrpl/tokens";
import { getXRPLClient, getPlatformWallet, RLUSD_ISSUER } from "@/lib/xrpl/client";

const INFX_PER_RLUSD = 100; // 1 RLUSD = 100 INFX

/**
 * POST /api/credits/deposit
 * Body: { txHash: string }
 *
 * Client sends the XRPL tx hash of their RLUSD payment to the platform address.
 * This route verifies the tx on-chain, mints equivalent INFX credits, and logs it.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyJWT(auth.slice(7));
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const { txHash } = (await req.json()) as { txHash: string };
  if (!txHash) return NextResponse.json({ error: "txHash required" }, { status: 400 });

  const db = getServiceClient();

  // Idempotency: check tx not already processed
  const { data: existing } = await db
    .from("credit_transactions")
    .select("id")
    .eq("xrpl_tx_hash", txHash)
    .single();

  if (existing) {
    return NextResponse.json({ error: "tx already processed" }, { status: 409 });
  }

  // Verify tx on-chain
  const client = await getXRPLClient();
  const platform = getPlatformWallet();

  let txResult: any;
  try {
    txResult = await client.request({ command: "tx", transaction: txHash });
  } catch {
    return NextResponse.json({ error: "tx not found on ledger" }, { status: 404 });
  }

  const tx = txResult.result;
  const meta = tx.meta;

  // Validate: must be a Payment to platform address of RLUSD
  if (
    tx.TransactionType !== "Payment" ||
    tx.Destination !== platform.address ||
    meta?.TransactionResult !== "tesSUCCESS"
  ) {
    return NextResponse.json({ error: "invalid or failed tx" }, { status: 400 });
  }

  // Extract RLUSD amount
  const amount = tx.Amount;
  if (typeof amount !== "object" || amount.currency !== "RLUSD" || amount.issuer !== RLUSD_ISSUER) {
    return NextResponse.json({ error: "tx is not an RLUSD payment" }, { status: 400 });
  }

  const rlusdAmount = parseFloat(amount.value);
  const infxAmount = (rlusdAmount * INFX_PER_RLUSD).toString();

  // Issue INFX credits to user's wallet
  const issueTxHash = await issueCredits(payload.sub, infxAmount);

  // Log deposit
  await db.from("credit_transactions").insert({
    user_id: payload.userId,
    tx_type: "deposit",
    amount: infxAmount,
    xrpl_tx_hash: txHash,
  });

  return NextResponse.json({
    success: true,
    creditsIssued: infxAmount,
    issueTxHash,
  });
}
