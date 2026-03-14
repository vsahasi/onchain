import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getServiceClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyJWT(auth.slice(7));
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const db = getServiceClient();

  // Get credit transactions sum as custodial balance
  const { data, error } = await db
    .from("credit_transactions")
    .select("tx_type, amount")
    .eq("user_id", payload.userId);

  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });

  let balance = 0;
  for (const tx of data ?? []) {
    const amt = parseFloat(tx.amount);
    if (tx.tx_type === "deposit" || tx.tx_type === "purchase") {
      balance += amt;
    } else if (tx.tx_type === "burn" || tx.tx_type === "sale") {
      balance -= amt;
    }
  }

  return NextResponse.json({ balance: Math.max(0, balance), userId: payload.userId });
}
