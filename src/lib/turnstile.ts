// Server-side verification of a Cloudflare Turnstile token.
// No-op (returns true) if TURNSTILE_SECRET_KEY isn't set, so the app works before
// Turnstile is configured. Fails open on a network error (don't block real users if
// Cloudflare is unreachable), but rejects a missing/invalid token when configured.
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → allow
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return true; // fail open on network error
  }
}
