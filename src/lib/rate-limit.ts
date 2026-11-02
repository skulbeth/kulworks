// Simple DB-backed sliding-window rate limiter for public endpoints.
// No external service — uses the RateLimit table. Fails open on error so a limiter
// hiccup never blocks legitimate traffic.
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Keys hold IPs ("track:1.2.3.4") and the privacy page promises no raw IPs are kept,
// so only a salted hash of the key is stored. Equality is all the limiter needs.
const SALT = process.env.CRON_SECRET || process.env.SUPABASE_SECRET_KEY || "kulworks-rate-limit";
function hashKey(key: string): string {
  const [scope] = key.split(":");
  return `${scope}:${createHash("sha256").update(`${key}|${SALT}`).digest("hex").slice(0, 24)}`;
}

/** Drop every limiter row older than a day (no window is longer). Run by the daily cron. */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
  return count;
}

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Returns true if allowed, false if the limit has been exceeded.
export async function rateLimit(rawKey: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const key = hashKey(rawKey);
  try {
    await prisma.rateLimit.deleteMany({ where: { key, createdAt: { lt: since } } });
    // Record this hit FIRST, then count: a burst of parallel requests each sees the
    // others, instead of all counting the same "under the limit" total.
    await prisma.rateLimit.create({ data: { key } });
    const count = await prisma.rateLimit.count({ where: { key, createdAt: { gte: since } } });
    return count <= limit;
  } catch {
    // Public forms fail open (a limiter hiccup must not block real people); sign-in
    // codes fail closed, so overloading the database can't buy unlimited guesses.
    return !rawKey.startsWith("2fa-");
  }
}
