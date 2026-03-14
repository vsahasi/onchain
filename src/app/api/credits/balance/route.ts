import { NextRequest, NextResponse } from "next/server";
import { getEffectiveBalance } from "@/lib/xrpl/tokens";
import { verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const walletParam = req.nextUrl.searchParams.get("wallet");

    let walletAddress: string | null = walletParam;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const session = await verifySessionToken(token);
      if (session) {
        walletAddress = session.wallet;
      }
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const balance = await getEffectiveBalance(walletAddress);

    return NextResponse.json({
      wallet_address: walletAddress,
      infx_balance: balance.effective_infx.toString(),
      onchain_infx: balance.onchain_infx.toString(),
      used_infx: balance.used_infx.toString(),
      rlusd_balance: balance.rlusd,
    });
  } catch (err) {
    console.error("Balance check error:", err);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
