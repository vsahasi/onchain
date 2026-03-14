import {
  TrustSet,
  Payment,
  AccountSet,
  AccountSetAsfFlags,
  Clawback,
} from "xrpl";
import {
  getXrplClient,
  getPlatformWallet,
  getCreditCurrency,
  getRlusdIssuer,
  getRlusdCurrency,
} from "./client";
import { getSupabase } from "@/lib/db/supabase";

export async function setupTrustLine(
  userAddress: string,
  currency: string,
  issuer: string,
  limit: string = "1000000000"
) {
  const client = await getXrplClient();
  const wallet = getPlatformWallet();

  const trustLine: TrustSet = {
    TransactionType: "TrustSet",
    Account: userAddress,
    LimitAmount: {
      currency,
      issuer,
      value: limit,
    },
  };

  const prepared = await client.autofill(trustLine);
  return { prepared, needsUserSignature: true };
}

export async function issueCredits(
  destinationAddress: string,
  amount: string
): Promise<string> {
  const client = await getXrplClient();
  const wallet = getPlatformWallet();
  const currency = getCreditCurrency();

  const payment: Payment = {
    TransactionType: "Payment",
    Account: wallet.classicAddress,
    Destination: destinationAddress,
    Amount: {
      currency,
      issuer: wallet.classicAddress,
      value: amount,
    },
  };

  const prepared = await client.autofill(payment);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const meta = result.result.meta;
  if (
    typeof meta === "object" &&
    meta !== null &&
    "TransactionResult" in meta &&
    meta.TransactionResult !== "tesSUCCESS"
  ) {
    throw new Error(`Failed to issue credits: ${meta.TransactionResult}`);
  }

  return typeof result.result.hash === "string" ? result.result.hash : "";
}

export async function burnCredits(
  userAddress: string,
  amount: string
): Promise<string> {
  const client = await getXrplClient();
  const wallet = getPlatformWallet();
  const currency = getCreditCurrency();

  const payment: Payment = {
    TransactionType: "Payment",
    Account: userAddress,
    Destination: wallet.classicAddress,
    Amount: {
      currency,
      issuer: wallet.classicAddress,
      value: amount,
    },
  };

  const prepared = await client.autofill(payment);
  return JSON.stringify(prepared);
}

export async function getCreditBalance(
  userAddress: string
): Promise<{ infx: string; rlusd: string }> {
  const client = await getXrplClient();
  const wallet = getPlatformWallet();
  const currency = getCreditCurrency();
  const rlusdIssuer = getRlusdIssuer();

  let infxBalance = "0";
  let rlusdBalance = "0";

  try {
    const response = await client.request({
      command: "account_lines",
      account: userAddress,
    });

    for (const line of response.result.lines) {
      if (
        line.currency === currency &&
        line.account === wallet.classicAddress
      ) {
        infxBalance = line.balance;
      }
      const rlusdHex = getRlusdCurrency();
      if ((line.currency === rlusdHex || line.currency === "RLUSD") && line.account === rlusdIssuer) {
        rlusdBalance = line.balance;
      }
    }
  } catch {
    // Account may not exist yet
  }

  return { infx: infxBalance, rlusd: rlusdBalance };
}

export interface EffectiveBalance {
  onchain_infx: number;
  used_infx: number;
  effective_infx: number;
  rlusd: string;
}

/**
 * Returns the effective IFX balance by subtracting DB-tracked burns from the
 * on-chain trust line balance. If userId is not provided, looks it up by wallet.
 */
export async function getEffectiveBalance(
  walletAddress: string,
  userId?: string
): Promise<EffectiveBalance> {
  const onchain = await getCreditBalance(walletAddress);
  const onchainInfx = parseFloat(onchain.infx);

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const db = getSupabase();
    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();
    resolvedUserId = user?.id;
  }

  let usedCredits = 0;
  if (resolvedUserId) {
    const db = getSupabase();
    const { data: burns } = await db
      .from("credit_transactions")
      .select("amount")
      .eq("user_id", resolvedUserId)
      .eq("tx_type", "burn");

    if (burns) {
      usedCredits = burns.reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0);
    }
  }

  const effective = Math.max(0, onchainInfx - usedCredits);

  return {
    onchain_infx: onchainInfx,
    used_infx: usedCredits,
    effective_infx: Math.round(effective * 100) / 100,
    rlusd: onchain.rlusd,
  };
}

export async function getTrustLineExists(
  userAddress: string,
  currency: string,
  issuer: string
): Promise<boolean> {
  const client = await getXrplClient();

  try {
    const response = await client.request({
      command: "account_lines",
      account: userAddress,
    });

    return response.result.lines.some(
      (line) => line.currency === currency && line.account === issuer
    );
  } catch {
    return false;
  }
}

/**
 * Claws back IFX tokens from a user's trust line. The platform wallet (issuer)
 * must have asfAllowTrustLineClawback enabled via enableClawback().
 */
export async function clawbackCredits(
  userAddress: string,
  amount: string
): Promise<string> {
  const client = await getXrplClient();
  const wallet = getPlatformWallet();
  const currency = getCreditCurrency();

  const clawback: Clawback = {
    TransactionType: "Clawback",
    Account: wallet.classicAddress,
    Amount: {
      currency,
      issuer: userAddress,
      value: amount,
    },
  };

  const prepared = await client.autofill(clawback);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const meta = result.result.meta;
  if (
    typeof meta === "object" &&
    meta !== null &&
    "TransactionResult" in meta &&
    meta.TransactionResult !== "tesSUCCESS"
  ) {
    throw new Error(`Clawback failed: ${meta.TransactionResult}`);
  }

  return typeof result.result.hash === "string" ? result.result.hash : "";
}

/**
 * One-time setup: enables the Clawback flag on the platform issuer account.
 * Must be called before any trust lines are created, or on testnet where
 * the amendment allows retroactive enablement.
 */
export async function enableClawback(): Promise<string> {
  const client = await getXrplClient();
  const wallet = getPlatformWallet();

  const accountSet: AccountSet = {
    TransactionType: "AccountSet",
    Account: wallet.classicAddress,
    SetFlag: AccountSetAsfFlags.asfAllowTrustLineClawback,
  };

  const prepared = await client.autofill(accountSet);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const meta = result.result.meta;
  if (
    typeof meta === "object" &&
    meta !== null &&
    "TransactionResult" in meta &&
    meta.TransactionResult !== "tesSUCCESS"
  ) {
    throw new Error(`Enable clawback failed: ${meta.TransactionResult}`);
  }

  return typeof result.result.hash === "string" ? result.result.hash : "";
}
