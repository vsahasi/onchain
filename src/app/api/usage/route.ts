import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { getSupabase } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await verifySessionToken(auth.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const db = getSupabase();
  const { data: user } = await db
    .from("users")
    .select("id")
    .eq("wallet_address", payload.wallet)
    .single();

  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { data, error } = await db
    .from("usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
