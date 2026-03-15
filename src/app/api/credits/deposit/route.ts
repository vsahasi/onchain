import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { issueCredits, getTrustLineExists } from "@/lib/xrpl/tokens";
import { getCreditCurrency, getPlatformAddress, getXrplClient } from "@/lib/xrpl/client";
import { getSupabase } from "@/lib/db/supabase";

const XRP_TO_CREDITS = 100; // 1 XRP = 100 IFX credits
const DROPS_PER_XRP = 1_000_000;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySessionToken(authHeader.slice(7));
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { tx_hash } = await req.json();
    if (!tx_hash) {
      return NextResponse.json({ error: "tx_hash is required" }, { status: 400 });
    }

    const walletAddress = session.wallet;
    const platformAddress = getPlatformAddress();

    // Idempotency check
    const db = getSupabase();
    const { data: existing } = await db
      .from("credit_transactions")
      .select("id")
      .eq("xrpl_tx_hash", tx_hash)
      .single();
    if (existing) {
      return NextResponse.json({ error: "tx already processed" }, { status: 409 });
    }

    // Verify tx on-chain
    const client = await getXrplClient();
    let txResult: Record<string, unknown>;
    try {
      const res = await client.request({ command: "tx", transaction: tx_hash });
      txResult = res.result as unknown as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "tx not found on ledger" }, { status: 404 });
    }

    const meta = (txResult.meta ?? txResult.metaData) as Record<string, unknown>;
    const txResultCode = (meta?.TransactionResult ?? txResult.engine_result) as string;
    // XRPL tx command nests fields inside tx_json
    const txJson = (txResult.tx_json ?? txResult) as Record<string, unknown>;
    console.error("[deposit] txResult keys:", Object.keys(txResult));
    console.error("[deposit] txJson keys:", Object.keys(txJson));
    console.error("[deposit] DeliverMax:", txJson["DeliverMax"], "Amount:", txJson["Amount"]);
    console.error("[deposit] txJson full:", JSON.stringify(txJson));

    if (
      txJson.TransactionType !== "Payment" ||
      txJson.Destination !== platformAddress ||
      (txResultCode && txResultCode !== "tesSUCCESS")
    ) {
      console.error("[deposit] validation failed:", {
        type: txJson.TransactionType,
        destination: txJson.Destination,
        expected: platformAddress,
        result: txResultCode,
      });
      return NextResponse.json({ error: "invalid or failed tx" }, { status: 400 });
    }

    if (txJson.Account !== walletAddress) {
      console.error("[deposit] sender mismatch:", { account: txJson.Account, wallet: walletAddress });
      return NextResponse.json({ error: "tx sender does not match session wallet" }, { status: 403 });
    }

    const amount = txJson["DeliverMax"] ?? txJson["Amount"];
    let xrpAmount: number;

    if (typeof amount === "string") {
      // Native XRP payment (drops)
      xrpAmount = parseInt(amount) / DROPS_PER_XRP;
    } else if (typeof amount === "object" && amount !== null) {
      // Issued currency — log and reject
      console.error("[deposit] got issued currency payment:", amount);
      return NextResponse.json({ error: "payment must be in XRP (received issued currency)" }, { status: 400 });
    } else {
      console.error("[deposit] unexpected amount type:", typeof amount, amount);
      return NextResponse.json({ error: "could not parse payment amount" }, { status: 400 });
    }
    const creditAmount = Math.floor(xrpAmount * XRP_TO_CREDITS);

    if (creditAmount < 1) {
      return NextResponse.json({ error: "minimum deposit is 0.01 XRP" }, { status: 400 });
    }

    // Check trust line, issue credits
    const currency = getCreditCurrency();
    const hasTrustLine = await getTrustLineExists(walletAddress, currency, platformAddress);
    if (!hasTrustLine) {
      return NextResponse.json(
        { error: "Trust line not established", action: "setup_trustline", currency, issuer: platformAddress },
        { status: 400 }
      );
    }

    const issueTxHash = await issueCredits(walletAddress, creditAmount.toString());

    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (user) {
      await db.from("credit_transactions").insert({
        user_id: user.id,
        tx_type: "deposit",
        amount: creditAmount.toString(),
        xrpl_tx_hash: tx_hash,
      });
    }

    return NextResponse.json({ success: true, credits_issued: creditAmount, tx_hash: issueTxHash });
  } catch (err) {
    console.error("Deposit error:", err);
    return NextResponse.json({ error: "Failed to process deposit" }, { status: 500 });
  }
}
