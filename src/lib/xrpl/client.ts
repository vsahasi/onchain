import { Client, Wallet } from "xrpl";

const XRPL_NETWORK = process.env.XRPL_NETWORK!;

let client: Client | null = null;

export async function getXRPLClient(): Promise<Client> {
  if (client && client.isConnected()) return client;
  client = new Client(XRPL_NETWORK);
  await client.connect();
  return client;
}

export function getPlatformWallet(): Wallet {
  const seed = process.env.XRPL_PLATFORM_SEED;
  if (!seed) throw new Error("XRPL_PLATFORM_SEED not set");
  return Wallet.fromSeed(seed);
}

export const RLUSD_ISSUER = process.env.RLUSD_ISSUER!;
export const CREDIT_CURRENCY = process.env.CREDIT_CURRENCY ?? "INFX";
