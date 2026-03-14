import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, generateApiKey } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";

async function requireUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifySessionToken(auth.slice(7));
  if (!payload) return null;

  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("id")
    .eq("wallet_address", payload.wallet)
    .single();
  return user ?? null;
}

// GET /api/keys — list user's API keys
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabase();
  const { data } = await db
    .from("api_keys")
    .select("id, key_prefix, name, is_active, created_at")
    .eq("user_id", user.id)
    .is("source_user_id", null)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

// POST /api/keys — create new API key
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name } = (await req.json()) as { name?: string };
  const { key, hash, prefix } = generateApiKey();

  const db = getSupabase();
  const { error } = await db.from("api_keys").insert({
    user_id: user.id,
    key_hash: hash,
    key_prefix: prefix,
    name: name ?? "Default",
    is_active: true,
  });

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });

  return NextResponse.json({ key, prefix }, { status: 201 });
}

// DELETE /api/keys?id=<id>
export async function DELETE(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getSupabase();
  await db
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
