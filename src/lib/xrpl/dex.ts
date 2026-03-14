import { OfferCreate, OfferCancel } from "xrpl";
import { getXRPLClient, getPlatformWallet, RLUSD_ISSUER, CREDIT_CURRENCY } from "./client";

export interface OrderBookEntry {
  account: string;
  takerGets: { currency: string; issuer?: string; value: string } | string;
  takerPays: { currency: string; issuer?: string; value: string } | string;
  sequence: number;
  quality: string;
}

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}

/** Fetch INFX/RLUSD orderbook from XRPL native DEX */
export async function getOrderBook(): Promise<OrderBook> {
  const client = await getXRPLClient();
  const platform = getPlatformWallet();

  const infxCurrency = { currency: CREDIT_CURRENCY, issuer: platform.address };
  const rlusdCurrency = { currency: "RLUSD", issuer: RLUSD_ISSUER };

  const [asksRes, bidsRes] = await Promise.all([
    client.request({
      command: "book_offers",
      taker_gets: infxCurrency,
      taker_pays: rlusdCurrency,
      limit: 20,
    }),
    client.request({
      command: "book_offers",
      taker_gets: rlusdCurrency,
      taker_pays: infxCurrency,
      limit: 20,
    }),
  ]);

  const mapOffer = (offer: any): OrderBookEntry => ({
    account: offer.Account,
    takerGets: offer.TakerGets,
    takerPays: offer.TakerPays,
    sequence: offer.Sequence,
    quality: offer.quality ?? "0",
  });

  return {
    asks: asksRes.result.offers.map(mapOffer),
    bids: bidsRes.result.offers.map(mapOffer),
  };
}

/** Build an OfferCreate transaction (to be signed by the user's wallet) */
export function buildOfferCreate(
  account: string,
  takerGetsINFX: string,
  takerPaysRLUSD: string
): OfferCreate {
  const platform = getPlatformWallet();
  return {
    TransactionType: "OfferCreate",
    Account: account,
    TakerGets: {
      currency: CREDIT_CURRENCY,
      issuer: platform.address,
      value: takerGetsINFX,
    },
    TakerPays: {
      currency: "RLUSD",
      issuer: RLUSD_ISSUER,
      value: takerPaysRLUSD,
    },
  };
}

/** Build an OfferCancel transaction */
export function buildOfferCancel(account: string, offerSequence: number): OfferCancel {
  return {
    TransactionType: "OfferCancel",
    Account: account,
    OfferSequence: offerSequence,
  };
}
