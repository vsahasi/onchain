/**
 * Token Escrow (XLS-85) helpers.
 * Escrow is used for secure conditional settlement of credit deposits.
 *
 * XLS-85 extends XRPL escrow to issued currencies.
 * For the hackathon MVP we wrap the standard EscrowCreate/EscrowFinish flow.
 */
import { getXRPLClient, getPlatformWallet, RLUSD_ISSUER, CREDIT_CURRENCY } from "./client";

export async function createDepositEscrow(
  fromAddress: string,
  rlusdAmount: string,
  finishAfterSeconds: number = 60
): Promise<{ escrowTx: object; finishAfter: number }> {
  const finishAfter = Math.floor(Date.now() / 1000) + finishAfterSeconds;

  // XLS-85 EscrowCreate for issued currency
  const escrowTx = {
    TransactionType: "EscrowCreate",
    Account: fromAddress,
    Amount: {
      currency: "RLUSD",
      issuer: RLUSD_ISSUER,
      value: rlusdAmount,
    },
    Destination: getPlatformWallet().address,
    FinishAfter: finishAfter,
  };

  return { escrowTx, finishAfter };
}

export async function finishEscrow(
  owner: string,
  offerSequence: number
): Promise<string> {
  const client = await getXRPLClient();
  const platform = getPlatformWallet();

  const tx = {
    TransactionType: "EscrowFinish",
    Account: platform.address,
    Owner: owner,
    OfferSequence: offerSequence,
  };

  const prepared = await client.autofill(tx as any);
  const signed = platform.sign(prepared as any);
  const result = await client.submitAndWait(signed.tx_blob);
  return result.result.hash;
}
