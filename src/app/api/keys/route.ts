import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, generateApiKey } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/supabase";

// GET /api/keys — list user's API keys
export async function GET(req: NextRequest) {
  const payload = requireJWT(req);
  if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getServiceClient();
  const { data } = await db
    .from("api_keys")
    .select("id, key_prefix, name, is_active, created_at")
    .eq("user_id", payload.userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

// POST /api/keys — create new API key
export async function POST(req: NextRequest) {
  const payload = requireJWT(req);
  if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name } = (await req.json()) as { name?: string };
  const { raw, hash, prefix } = generateApiKey();

  const db = getServiceClient();
  const { error } = await db.from("api_keys").insert({
    user_id: payload.userId,
    key_hash: hash,
    key_prefix: prefix,
    name: name ?? "Default",
    is_active: true,
  });

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });

  // Raw key shown only once
  return NextResponse.json({ key: raw, prefix }, { status: 201 });
}

// DELETE /api/keys?id=<id>
export async function DELETE(req: NextRequest) {
  const payload = requireJWT(req);
  if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getServiceClient();
  await db
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", payload.userId);

  return NextResponse.json({ success: true });
}

function requireJWT(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return verifyJWT(auth.slice(7));
  } catch {
    return null;
  }
}
