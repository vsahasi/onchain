import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { issueCredits, getTrustLineExists } from "@/lib/xrpl/tokens";
import { getCreditCurrency, getPlatformAddress } from "@/lib/xrpl/client";
import { getSupabase } from "@/lib/db/supabase";
import { rlusdToCredits } from "@/lib/gateway/metering";

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

    const { rlusd_amount, tx_hash } = await req.json();

    if (!rlusd_amount || !tx_hash) {
      return NextResponse.json(
        { error: "rlusd_amount and tx_hash are required" },
        { status: 400 }
      );
    }

    const walletAddress = session.wallet;
    const currency = getCreditCurrency();
    const platformAddress = getPlatformAddress();

    const hasTrustLine = await getTrustLineExists(
      walletAddress,
      currency,
      platformAddress
    );

    if (!hasTrustLine) {
      return NextResponse.json(
        {
          error: "Trust line not established",
          action: "setup_trustline",
          currency,
          issuer: platformAddress,
        },
        { status: 400 }
      );
    }

    const creditAmount = rlusdToCredits(parseFloat(rlusd_amount));
    const txHash = await issueCredits(walletAddress, creditAmount.toString());

    const db = getSupabase();

    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (user) {
      await db.from("credit_transactions").insert({
        user_id: user.id,
        tx_type: "deposit",
        amount: creditAmount,
        xrpl_tx_hash: txHash,
      });
    }

    return NextResponse.json({
      success: true,
      credits_issued: creditAmount,
      tx_hash: txHash,
      wallet_address: walletAddress,
    });
  } catch (err) {
    console.error("Deposit error:", err);
    return NextResponse.json(
      { error: "Failed to process deposit" },
      { status: 500 }
    );
  }
}
