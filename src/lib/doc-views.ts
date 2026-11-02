// "Has the client opened it?" for quote/invoice and proof pages.
//
// Those pages fire the normal page-view beacon, and /api/track drops views from a
// logged-in admin, so whatever is in PageView for a doc's path is the client (or
// whoever they forwarded the link to).
import { prisma } from "@/lib/prisma";

export type DocViews = {
  count: number;
  first: Date;
  last: Date;
  city: string | null;
  device: string | null;
};

/** Public paths a client opens. usePathname may or may not carry the trailing slash. */
export const invoicePath = (token: string) => `/invoice/${token}/`;
export const proofPath = (token: string) => `/proof/${token}/`;

/** View summary per path (keyed with the trailing slash). Paths never opened are absent. */
export async function docViews(paths: string[]): Promise<Map<string, DocViews>> {
  const out = new Map<string, DocViews>();
  if (paths.length === 0) return out;
  const variants = paths.flatMap((p) => [p, p.replace(/\/$/, "")]);
  const rows = await prisma.pageView.findMany({
    where: { path: { in: variants } },
    orderBy: { createdAt: "asc" },
    select: { path: true, createdAt: true, city: true, device: true },
  });
  for (const r of rows) {
    const key = r.path.endsWith("/") ? r.path : `${r.path}/`;
    const v = out.get(key);
    if (!v) {
      out.set(key, { count: 1, first: r.createdAt, last: r.createdAt, city: r.city, device: r.device });
    } else {
      v.count += 1;
      v.last = r.createdAt;
      v.city = r.city ?? v.city;
      v.device = r.device ?? v.device;
    }
  }
  return out;
}
