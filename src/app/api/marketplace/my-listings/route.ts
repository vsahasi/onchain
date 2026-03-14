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

// GET /api/marketplace/my-listings — seller's own listings
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabase();
  const { data, error } = await db
    .from("marketplace_listings")
    .select("id, title, description, price_rlusd, credit_limit, max_purchases, purchase_count, is_active, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}
