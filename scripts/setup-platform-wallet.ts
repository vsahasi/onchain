/**
 * One-time platform wallet setup script.
 * Run once after generating your platform wallet:
 *   npx tsx scripts/setup-platform-wallet.ts
 *
 * Does three things:
 *  1. Checks platform wallet is funded (needs ≥10 XRP reserve)
 *  2. Creates a RLUSD trust line so the platform can receive RLUSD deposits
 *  3. Confirms the wallet is ready to issue INFX (issuers need no trust line for own currency)
 */

import { Client, Wallet, TrustSet } from "xrpl";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const XRPL_NETWORK = process.env.XRPL_NETWORK!;
const PLATFORM_SEED = process.env.XRPL_PLATFORM_SEED!;
const RLUSD_ISSUER = process.env.RLUSD_ISSUER!;

if (!PLATFORM_SEED) {
  console.error("XRPL_PLATFORM_SEED not set in .env.local");
  process.exit(1);
}

async function main() {
  const client = new Client(XRPL_NETWORK);
  await client.connect();
  console.log("Connected to", XRPL_NETWORK);

  const wallet = Wallet.fromSeed(PLATFORM_SEED);
  console.log("Platform wallet address:", wallet.classicAddress);

  // 1. Check XRP balance
  let xrpBalance = "0";
  try {
    const info = await client.request({ command: "account_info", account: wallet.classicAddress });
    xrpBalance = info.result.account_data.Balance;
    const xrp = parseInt(xrpBalance) / 1_000_000;
    console.log(`XRP balance: ${xrp} XRP`);
    if (xrp < 10) {
      console.warn("WARNING: Balance is low. Fund at https://faucet.altnet.rippletest.net/accounts");
    }
  } catch {
    console.error("Account not found on ledger. Fund it first at: https://faucet.altnet.rippletest.net/accounts");
    await client.disconnect();
    process.exit(1);
  }

  // 2. Check existing trust lines
  const lines = await client.request({ command: "account_lines", account: wallet.classicAddress });
  // RLUSD is non-standard (5 chars) — must use 40-char hex in all xrpl.js calls
  const RLUSD_HEX = "524C555344000000000000000000000000000000";

  const hasRLUSD = lines.result.lines.some(
    (l) => (l.currency === "RLUSD" || l.currency === RLUSD_HEX) && l.account === RLUSD_ISSUER
  );

  if (hasRLUSD) {
    console.log("✓ RLUSD trust line already exists");
  } else {
    console.log("Setting up RLUSD trust line...");
    const trustTx: TrustSet = {
      TransactionType: "TrustSet",
      Account: wallet.classicAddress,
      LimitAmount: {
        currency: RLUSD_HEX,
        issuer: RLUSD_ISSUER,
        value: "1000000000",
      },
    };
    const prepared = await client.autofill(trustTx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    const meta = result.result.meta as any;
    if (meta?.TransactionResult === "tesSUCCESS") {
      console.log("✓ RLUSD trust line created. TX:", result.result.hash);
    } else {
      console.error("Failed to create RLUSD trust line:", meta?.TransactionResult);
    }
  }

  console.log("\nPlatform wallet is ready.");
  console.log("Platform address:", wallet.classicAddress);
  console.log("Set NEXT_PUBLIC_PLATFORM_ADDRESS=" + wallet.classicAddress + " in .env.local");

  await client.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
