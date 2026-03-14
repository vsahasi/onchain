import { NextRequest, NextResponse } from "next/server";
import { getOrderBook, buildOfferCreate } from "@/lib/xrpl/dex";

// GET /api/marketplace — returns INFX/RLUSD orderbook
export async function GET(req: NextRequest) {
  try {
    const orderbook = await getOrderBook();
    return NextResponse.json(orderbook);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/marketplace — build an unsigned OfferCreate tx for the client to sign
export async function POST(req: NextRequest) {
  const { takerGetsINFX, takerPaysRLUSD, account } = await req.json();
  if (!takerGetsINFX || !takerPaysRLUSD) {
    return NextResponse.json({ error: "takerGetsINFX and takerPaysRLUSD required" }, { status: 400 });
  }
  // account is optional here — client fills it in before signing
  const tx = buildOfferCreate(account ?? "", takerGetsINFX, takerPaysRLUSD);
  return NextResponse.json({ tx });
}
