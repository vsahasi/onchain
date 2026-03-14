import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db/supabase";
import { signJWT, generateNonce } from "@/lib/auth";

// GET /api/auth?action=nonce&address=r...
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const nonce = generateNonce();
  // In production: store nonce in DB/Redis with TTL. For MVP, include in response.
  return NextResponse.json({ nonce });
}

// POST /api/auth — { address, nonce, signature }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address, nonce, signature } = body as {
    address: string;
    nonce: string;
    signature: string;
  };

  if (!address || !nonce || !signature) {
    return NextResponse.json({ error: "address, nonce, signature required" }, { status: 400 });
  }

  // Verify the XRPL signature
  // Crossmark signs arbitrary messages; we verify the nonce was signed by address
  // xrpl.js verifyPayment is for tx verification; for message signing we check
  // that the signature is a valid hex string tied to the wallet (simplified for MVP)
  // TODO: use xrpl-accountlib or @xrplf/secret-numbers for full message verify
  const isValid = signature.length > 10; // placeholder — replace with actual sig check

  if (!isValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const db = getServiceClient();

  // Upsert user
  const { data: user, error } = await db
    .from("users")
    .upsert({ wallet_address: address }, { onConflict: "wallet_address" })
    .select("id, wallet_address")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  const token = signJWT({ sub: address, userId: user.id });
  return NextResponse.json({ token, userId: user.id });
}
