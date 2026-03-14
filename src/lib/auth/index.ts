import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-to-a-random-secret"
);

export async function createSessionToken(walletAddress: string): Promise<string> {
  return new SignJWT({ wallet: walletAddress })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<{ wallet: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { wallet: payload.wallet as string };
  } catch {
    return null;
  }
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `infx_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.slice(0, 12);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateChallenge(): string {
  return crypto.randomBytes(32).toString("hex");
}
