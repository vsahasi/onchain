/**
 * Verifies a signed XRPL transaction blob proves ownership of a wallet address.
 *
 * Flow: frontend calls sdk.methods.signAndWait (sign-only, no submit) with an
 * AccountSet tx containing the nonce as a hex-encoded memo. The signed tx_blob
 * is sent to the backend here for verification.
 *
 * Checks:
 *  1. Decode the blob and derive the address from SigningPubKey — must match claimed address.
 *  2. Verify the nonce is present in MemoData.
 *  3. Cryptographically verify TxnSignature against the serialized signing payload.
 */

// ripple-keypairs and ripple-binary-codec are bundled with xrpl
// eslint-disable-next-line @typescript-eslint/no-require-imports
const keypairs = require("ripple-keypairs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const binaryCodec = require("ripple-binary-codec");

export function verifyXRPLSignature(
  txBlob: string,
  expectedAddress: string,
  expectedNonce: string
): boolean {
  try {
    const decoded = binaryCodec.decode(txBlob) as Record<string, any>;

    // 1. Verify SigningPubKey derives to the claimed address
    const derivedAddress: string = keypairs.deriveAddress(decoded.SigningPubKey);
    if (derivedAddress !== expectedAddress) return false;

    // 2. Verify nonce is in the first memo
    const memos: any[] = decoded.Memos ?? [];
    if (!memos.length) return false;
    const memoHex: string = memos[0]?.Memo?.MemoData ?? "";
    if (!memoHex) return false;
    const memoText = Buffer.from(memoHex, "hex").toString("utf8");
    if (memoText !== expectedNonce) return false;

    // 3. Cryptographically verify the signature
    const signingPayload: string = binaryCodec.encodeForSigning(decoded);
    const isValid: boolean = keypairs.verify(
      signingPayload,
      decoded.TxnSignature,
      decoded.SigningPubKey
    );
    return isValid;
  } catch {
    return false;
  }
}
