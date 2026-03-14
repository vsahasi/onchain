import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";

async function requireUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const session = await verifySessionToken(auth.slice(7));
  if (!session) return null;
  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("id, wallet_address")
    .eq("wallet_address", session.wallet)
    .single();
  return user ?? null;
}

// GET /api/marketplace/listings — list all active listings (no auth required)
// GET /api/marketplace/listings?mine=true — list only current user's listings
export async function GET(req: NextRequest) {
  const db = getSupabase();
  const mine = req.nextUrl.searchParams.get("mine") === "true";

  if (mine) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await db
      .from("marketplace_listings")
      .select("id, title, description, price_rlusd, credit_limit, max_purchases, purchase_count, is_active, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "db error" }, { status: 500 });
    return NextResponse.json({ listings: data ?? [] });
  }

  const { data, error } = await db
    .from("marketplace_listings")
    .select(`
      id, title, description, price_rlusd, credit_limit,
      max_purchases, purchase_count, created_at,
      seller:seller_id ( wallet_address )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

// POST /api/marketplace/listings — create a new listing
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as {
    title?: string;
    description?: string;
    price_rlusd?: string;
    credit_limit?: string;
    max_purchases?: number;
  };

  const { title, description = "", price_rlusd, credit_limit = "0", max_purchases = 0 } = body;

  if (!title || !price_rlusd) {
    return NextResponse.json({ error: "title and price_rlusd are required" }, { status: 400 });
  }
  if (parseFloat(price_rlusd) <= 0) {
    return NextResponse.json({ error: "price_rlusd must be positive" }, { status: 400 });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from("marketplace_listings")
    .insert({
      seller_id: user.id,
      title,
      description,
      price_rlusd,
      credit_limit,
      max_purchases,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "db error", detail: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}

// PATCH /api/marketplace/listings — toggle listing active/inactive
export async function PATCH(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, is_active } = await req.json() as { id: string; is_active: boolean };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getSupabase();
  const { error } = await db
    .from("marketplace_listings")
    .update({ is_active })
    .eq("id", id)
    .eq("seller_id", user.id);

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
