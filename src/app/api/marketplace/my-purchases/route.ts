import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";

async function requireAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifySessionToken(auth.slice(7));
  if (!payload) return null;

  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("id, wallet_address")
    .eq("wallet_address", payload.wallet)
    .single();
  return user ?? null;
}

// GET /api/marketplace/my-purchases — buyer's purchase history
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabase();
  const { data, error } = await db
    .from("marketplace_purchases")
    .select(`
      id, price_paid_rlusd, xrpl_tx_hash, created_at,
      listing:listing_id(title, description),
      api_key:api_key_id(id, key_prefix, is_active)
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }

  return NextResponse.json({ purchases: data ?? [] });
}
