import { TrustSet, Payment } from "xrpl";
import {
  getXrplClient,
  getPlatformWallet,
  getCreditCurrency,
  getRlusdIssuer,
  getRlusdCurrency,
} from "./client";

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
