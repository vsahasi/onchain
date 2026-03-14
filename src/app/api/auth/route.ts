import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  generateApiKey,
  generateChallenge,
} from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";

export async function GET() {
  const challenge = generateChallenge();
  return NextResponse.json({ challenge });
}

export async function POST(req: NextRequest) {
  try {
    const { wallet_address, signature, challenge } = await req.json();

    if (!wallet_address || !signature || !challenge) {
      return NextResponse.json(
        { error: "wallet_address, signature, and challenge are required" },
        { status: 400 }
      );
    }

    // For the hackathon MVP, we accept wallet address directly.
    // In production, we'd verify the XRPL signature against the challenge.
    // Crossmark signs with the wallet, and we verify ownership.

    const db = getSupabase();

    const { data: existingUser } = await db
      .from("users")
      .select("*")
      .eq("wallet_address", wallet_address)
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error } = await db
        .from("users")
        .insert({ wallet_address })
        .select()
        .single();

      if (error || !newUser) {
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }
      userId = newUser.id;
    }

    const sessionToken = await createSessionToken(wallet_address);

    const { key, hash, prefix } = generateApiKey();
    await db.from("api_keys").insert({
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name: "Default Key",
      is_active: true,
    });

    return NextResponse.json({
      session_token: sessionToken,
      api_key: key,
      wallet_address,
      user_id: userId,
    });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
