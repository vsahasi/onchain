import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let payload;
  try { payload = verifyJWT(auth.slice(7)); } catch { return NextResponse.json({ error: "invalid token" }, { status: 401 }); }

  const db = getServiceClient();
  const { data, error } = await db
    .from("usage_logs")
    .select("*")
    .eq("user_id", payload.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
