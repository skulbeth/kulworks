// Email-based 2FA: one-time codes + a signed "this session passed email 2FA" cookie.
// (The authenticator-app path is handled by Supabase MFA/AAL; this covers the email option.)
import crypto from "crypto";

export const TWOFA_COOKIE = "kw2fa";
export const COOKIE_TTL_MS = 12 * 60 * 60 * 1000; // re-verify email 2FA at most ~twice/day
export const CODE_TTL_MS = 10 * 60 * 1000; // emailed code is valid 10 minutes

// Server-only secret used to sign the cookie. Reusing the Supabase service key avoids
// introducing another env var; it never leaves the server. No fallback: a guessable key
// would let anyone forge "passed 2FA" for any user.
function secret() {
  const s = process.env.SUPABASE_SECRET_KEY;
  if (!s) throw new Error("SUPABASE_SECRET_KEY is not set");
  return s;
}

function hmac(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

// Build the cookie value: userId.sessionId.expiryMs.signature. The Supabase session id
// ties it to this one sign-in: a copied cookie is useless with any other session, and
// signing out (which ends the session) kills it.
export function signSession(userId: string, sessionId: string, expMs: number): string {
  const payload = `${userId}.${sessionId}.${expMs}`;
  return `${payload}.${hmac(payload)}`;
}

// Verify a cookie value belongs to this user AND session and hasn't expired or been
// tampered with.
export function verifySession(
  value: string | undefined,
  userId: string,
  sessionId: string | null,
  now: number
): boolean {
  if (!value || !sessionId) return false;
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const [uid, sid, expStr, sig] = parts;
  if (uid !== userId || sid !== sessionId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  const expected = hmac(`${uid}.${sid}.${expStr}`);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function newCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}
