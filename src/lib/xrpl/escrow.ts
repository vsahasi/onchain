import { EscrowCreate, EscrowFinish } from "xrpl";
import { getXrplClient, getPlatformWallet, getRlusdIssuer } from "./client";

export async function createDepositEscrow(
  userAddress: string,
  rlusdAmount: string,
  cancelAfterSeconds: number = 3600
): Promise<EscrowCreate> {
  const platformWallet = getPlatformWallet();

  const cancelAfter = Math.floor(Date.now() / 1000) + cancelAfterSeconds + 946684800;

  return {
    TransactionType: "EscrowCreate",
    Account: userAddress,
    Destination: platformWallet.classicAddress,
    Amount: rlusdAmount,
    CancelAfter: cancelAfter,
  };
}

export async function finishEscrow(
  ownerAddress: string,
  escrowSequence: number
): Promise<string> {
  const client = await getXrplClient();
  const platformWallet = getPlatformWallet();

  const escrowFinish: EscrowFinish = {
    TransactionType: "EscrowFinish",
    Account: platformWallet.classicAddress,
    Owner: ownerAddress,
    OfferSequence: escrowSequence,
  };

  const prepared = await client.autofill(escrowFinish);
  const signed = platformWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  return typeof result.result.hash === "string" ? result.result.hash : "";
}
