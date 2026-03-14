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

// DELETE /api/marketplace/listings/[id] — deactivate own listing
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabase();

  const { data: listing } = await db
    .from("marketplace_listings")
    .select("id, seller_id")
    .eq("id", id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .from("marketplace_listings")
    .update({ is_active: false })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
