import { Client, Wallet } from "xrpl";

let clientInstance: Client | null = null;
let connectionPromise: Promise<Client> | null = null;

export function getXrplNetwork(): string {
  return process.env.XRPL_NETWORK || "wss://s.altnet.rippletest.net:51233";
}

export async function getXrplClient(): Promise<Client> {
  if (clientInstance?.isConnected()) {
    return clientInstance;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const client = new Client(getXrplNetwork());
    await client.connect();
    clientInstance = client;
    connectionPromise = null;
    return client;
  })();

  return connectionPromise;
}

export function getPlatformWallet(): Wallet {
  const seed = process.env.XRPL_PLATFORM_SEED;
  if (!seed) {
    throw new Error("XRPL_PLATFORM_SEED environment variable is not set");
  }
  return Wallet.fromSeed(seed);
}

export function getRlusdIssuer(): string {
  return process.env.RLUSD_ISSUER || "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
}

export function getRlusdCurrency(): string {
  return "524C555344000000000000000000000000000000";
}

export function getCreditCurrency(): string {
  return process.env.CREDIT_CURRENCY || "IFX";
}

export function getPlatformAddress(): string {
  return getPlatformWallet().classicAddress;
}
