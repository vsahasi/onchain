import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  sub: string; // wallet address
  userId: string;
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/** Generate a raw API key (shown to user once) and its SHA-256 hash for storage */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `infx_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

/** Hash an incoming API key for DB lookup */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Generate a nonce challenge for wallet signature auth */
export function generateNonce(): string {
  return `Sign in to INFX Marketplace: ${randomBytes(16).toString("hex")}`;
}
