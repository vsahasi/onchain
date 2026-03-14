import { NextResponse } from "next/server";
import { getOrderBook } from "@/lib/xrpl/dex";

export async function GET() {
  try {
    const orderBook = await getOrderBook();

    const asks = orderBook.asks.map((offer) => {
      const getsValue =
        typeof offer.TakerGets === "string"
          ? offer.TakerGets
          : offer.TakerGets.value;
      const paysValue =
        typeof offer.TakerPays === "string"
          ? offer.TakerPays
          : offer.TakerPays.value;
      return {
        account: offer.Account,
        infx_amount: paysValue,
        rlusd_amount: getsValue,
        price: (parseFloat(getsValue) / parseFloat(paysValue)).toFixed(6),
        sequence: offer.Sequence,
      };
    });

    const bids = orderBook.bids.map((offer) => {
      const getsValue =
        typeof offer.TakerGets === "string"
          ? offer.TakerGets
          : offer.TakerGets.value;
      const paysValue =
        typeof offer.TakerPays === "string"
          ? offer.TakerPays
          : offer.TakerPays.value;
      return {
        account: offer.Account,
        infx_amount: getsValue,
        rlusd_amount: paysValue,
        price: (parseFloat(paysValue) / parseFloat(getsValue)).toFixed(6),
        sequence: offer.Sequence,
      };
    });

    return NextResponse.json({ asks, bids });
  } catch (err) {
    console.error("Marketplace error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order book" },
      { status: 500 }
    );
  }
}
