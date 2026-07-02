// Simple DB-backed sliding-window rate limiter for public endpoints.
// No external service — uses the RateLimit table. Fails open on error so a limiter
// hiccup never blocks legitimate traffic.
import { prisma } from "@/lib/prisma";

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Returns true if allowed, false if the limit has been exceeded.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  try {
    await prisma.rateLimit.deleteMany({ where: { key, createdAt: { lt: since } } });
    const count = await prisma.rateLimit.count({ where: { key, createdAt: { gte: since } } });
    if (count >= limit) return false;
    await prisma.rateLimit.create({ data: { key } });
    return true;
  } catch {
    return true; // fail open
  }
}
