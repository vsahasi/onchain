import { NextRequest, NextResponse } from "next/server";
import { getXrplClient as getXRPLClient } from "@/lib/xrpl/client";

/**
 * POST /api/xrpl/submit
 * Submits a signed tx_blob to XRPL and waits for validation.
 * Used after the frontend gets a signed blob back from Crossmark.
 */
export async function POST(req: NextRequest) {
  const { txBlob } = await req.json();
  if (!txBlob) return NextResponse.json({ error: "txBlob required" }, { status: 400 });

  try {
    const client = await getXRPLClient();
    const result = await client.submitAndWait(txBlob);
    const meta = result.result.meta as any;
    return NextResponse.json({
      hash: result.result.hash,
      result: meta?.TransactionResult,
      success: meta?.TransactionResult === "tesSUCCESS",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
