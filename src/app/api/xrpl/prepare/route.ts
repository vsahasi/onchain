import { NextRequest, NextResponse } from "next/server";
import { getXrplClient as getXRPLClient } from "@/lib/xrpl/client";

/**
 * POST /api/xrpl/prepare
 * Autofills a transaction server-side (Sequence, Fee, LastLedgerSequence).
 * The frontend then passes the pre-filled tx to Crossmark for signing only —
 * so Crossmark never needs to hit the XRPL network itself.
 */
export async function POST(req: NextRequest) {
  const { tx } = await req.json();
  if (!tx) return NextResponse.json({ error: "tx required" }, { status: 400 });

  try {
    const client = await getXRPLClient();
    const prepared = await client.autofill(tx);
    // Default buffer is ~4 ledgers (~16s). User signing takes longer — extend to 100 ledgers (~7 min).
    if (prepared.LastLedgerSequence) {
      prepared.LastLedgerSequence += 96;
    }
    return NextResponse.json({ preparedTx: prepared });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
