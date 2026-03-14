import { Payment, TrustSet } from "xrpl";
import { getXRPLClient, getPlatformWallet, RLUSD_ISSUER, CREDIT_CURRENCY } from "./client";

/** Establish trust line for INFX on user's account (signed by user via wallet) */
export function buildTrustLineTransaction(userAddress: string, limit: string = "1000000000") {
  return {
    TransactionType: "TrustSet" as const,
    Account: userAddress,
    LimitAmount: {
      currency: CREDIT_CURRENCY,
      issuer: getPlatformWallet().address,
      value: limit,
    },
  };
}

/** Issue INFX credits to a user address (signed by platform issuer) */
export async function issueCredits(toAddress: string, amount: string): Promise<string> {
  const client = await getXRPLClient();
  const platform = getPlatformWallet();

  const tx: Payment = {
    TransactionType: "Payment",
    Account: platform.address,
    Destination: toAddress,
    Amount: {
      currency: CREDIT_CURRENCY,
      issuer: platform.address,
      value: amount,
    },
  };

  const prepared = await client.autofill(tx);
  const signed = platform.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const meta = result.result.meta;
  if (typeof meta === "object" && meta !== null && "TransactionResult" in meta) {
    if (meta.TransactionResult !== "tesSUCCESS") {
      throw new Error(`Issue credits failed: ${meta.TransactionResult}`);
    }
  }

  return result.result.hash;
}

/** Burn INFX credits (send from user custodial balance back to issuer) */
export async function burnCredits(fromAddress: string, amount: string): Promise<string> {
  const client = await getXRPLClient();
  const platform = getPlatformWallet();

  // Platform acts as custodian — burns from its held balance on behalf of user
  const tx: Payment = {
    TransactionType: "Payment",
    Account: platform.address,
    Destination: platform.address,
    Amount: {
      currency: CREDIT_CURRENCY,
      issuer: platform.address,
      value: amount,
    },
    // In custodial model, platform tracks per-user balances in DB
    // and burns from its own issued supply
  };

  const prepared = await client.autofill(tx);
  const signed = platform.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const meta = result.result.meta;
  if (typeof meta === "object" && meta !== null && "TransactionResult" in meta) {
    if (meta.TransactionResult !== "tesSUCCESS") {
      throw new Error(`Burn credits failed: ${meta.TransactionResult}`);
    }
  }

  return result.result.hash;
}

/** Get INFX balance for an address */
export async function getINFXBalance(address: string): Promise<string> {
  const client = await getXRPLClient();
  const platform = getPlatformWallet();

  try {
    const lines = await client.request({
      command: "account_lines",
      account: address,
      peer: platform.address,
    });

    const infxLine = lines.result.lines.find(
      (l) => l.currency === CREDIT_CURRENCY
    );
    return infxLine?.balance ?? "0";
  } catch {
    return "0";
  }
}
