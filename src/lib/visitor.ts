// Privacy-friendly visitor identity for analytics. We never store a raw IP address;
// instead we store a short, salted, non-reversible hash of it. That gives us a stable
// per-visitor id (to count unique visitors and flag your own traffic) without keeping
// anything that identifies a person.
import { createHash } from "node:crypto";

// Reuse an existing server secret as the salt (no new env var needed).
const SALT =
  process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "kulworks-analytics-salt";

/** Extract the client IP from request headers (Vercel sets x-forwarded-for). */
export function ipFromHeaders(h: { get(name: string): string | null }): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Short salted hash of an IP — a stable, non-reversible per-visitor id (null if unknown). */
export function visitorHash(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  return createHash("sha256").update(`${ip}|${SALT}`).digest("hex").slice(0, 12);
}
