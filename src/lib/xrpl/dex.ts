import { OfferCreate, OfferCancel } from "xrpl";
import {
  getXrplClient,
  getPlatformWallet,
  getCreditCurrency,
  getRlusdIssuer,
  getRlusdCurrency,
} from "./client";

export interface BookOffer {
  Account: string;
  TakerGets: { currency: string; issuer: string; value: string } | string;
  TakerPays: { currency: string; issuer: string; value: string } | string;
  Sequence: number;
  quality?: string;
}

export interface OrderBook {
  asks: BookOffer[];
  bids: BookOffer[];
}

export async function getOrderBook(): Promise<OrderBook> {
  const client = await getXrplClient();
  const platformWallet = getPlatformWallet();
  const currency = getCreditCurrency();
  const rlusdIssuer = getRlusdIssuer();

  const infxToken = {
    currency,
    issuer: platformWallet.classicAddress,
  };

  const rlusdToken = {
    currency: getRlusdCurrency(),
    issuer: rlusdIssuer,
  };

  const [asksResponse, bidsResponse] = await Promise.all([
    client.request({
      command: "book_offers",
      taker_gets: rlusdToken,
      taker_pays: infxToken,
      limit: 50,
    }),
    client.request({
      command: "book_offers",
      taker_gets: infxToken,
      taker_pays: rlusdToken,
      limit: 50,
    }),
  ]);

  return {
    asks: (asksResponse.result.offers || []) as unknown as BookOffer[],
    bids: (bidsResponse.result.offers || []) as unknown as BookOffer[],
  };
}

export function buildSellOffer(
  userAddress: string,
  infxAmount: string,
  rlusdAmount: string
): OfferCreate {
  const platformWallet = getPlatformWallet();
  const currency = getCreditCurrency();
  const rlusdIssuer = getRlusdIssuer();

  return {
    TransactionType: "OfferCreate",
    Account: userAddress,
    TakerGets: {
      currency,
      issuer: platformWallet.classicAddress,
      value: infxAmount,
    },
    TakerPays: {
      currency: getRlusdCurrency(),
      issuer: rlusdIssuer,
      value: rlusdAmount,
    },
  };
}

export function buildBuyOffer(
  userAddress: string,
  infxAmount: string,
  rlusdAmount: string
): OfferCreate {
  const platformWallet = getPlatformWallet();
  const currency = getCreditCurrency();
  const rlusdIssuer = getRlusdIssuer();

  return {
    TransactionType: "OfferCreate",
    Account: userAddress,
    TakerGets: {
      currency: getRlusdCurrency(),
      issuer: rlusdIssuer,
      value: rlusdAmount,
    },
    TakerPays: {
      currency,
      issuer: platformWallet.classicAddress,
      value: infxAmount,
    },
  };
}

export function buildCancelOffer(
  userAddress: string,
  offerSequence: number
): OfferCancel {
  return {
    TransactionType: "OfferCancel",
    Account: userAddress,
    OfferSequence: offerSequence,
  };
}
