// Email-based 2FA: one-time codes + a signed "this session passed email 2FA" cookie.
// (The authenticator-app path is handled by Supabase MFA/AAL; this covers the email option.)
import crypto from "crypto";

export const TWOFA_COOKIE = "kw2fa";
export const COOKIE_TTL_MS = 12 * 60 * 60 * 1000; // re-verify email 2FA at most ~twice/day
export const CODE_TTL_MS = 10 * 60 * 1000; // emailed code is valid 10 minutes

// Server-only secret used to sign the cookie. Reusing the Supabase service key avoids
// introducing another env var; it never leaves the server.
function secret() {
  return process.env.SUPABASE_SECRET_KEY || "kulworks-dev-fallback-secret";
}

function hmac(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

// Build the cookie value: userId.expiryMs.signature
export function signSession(userId: string, expMs: number): string {
  const payload = `${userId}.${expMs}`;
  return `${payload}.${hmac(payload)}`;
}

// Verify a cookie value belongs to this user and hasn't expired or been tampered with.
export function verifySession(value: string | undefined, userId: string, now: number): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  const expected = hmac(`${uid}.${expStr}`);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function newCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}
