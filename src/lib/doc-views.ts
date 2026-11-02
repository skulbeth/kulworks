// "Has the client opened it?" for quote/invoice and proof pages.
//
// Those pages fire the normal page-view beacon, and /api/track drops views from a
// logged-in admin or one of Sam's known visitor hashes, so whatever is in PageView
// for a doc's path is the client (or whoever they forwarded the link to). Rows from
// an owner hash are still filtered here, for views stored before the hash was known.
import { prisma } from "@/lib/prisma";
import { getOwnerHashes } from "@/lib/owner-visits";

const TZ = "America/Chicago";

/** Rows not from Sam's own devices. A null hash (unknown IP) counts as a client. */
async function notOwner() {
  const hashes = await getOwnerHashes().catch(() => [] as string[]);
  return hashes.length ? { OR: [{ visitorHash: null }, { visitorHash: { notIn: hashes } }] } : {};
}

/** YYYY-MM-DD in Sam's time zone, for once-a-day dedupe keys. */
const chicagoDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

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
    where: { path: { in: variants }, ...(await notOwner()) },
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

/**
 * Called after a client page view is stored: tells Sam the first time a client opens
 * a quote/invoice/proof, and again when they come back after a quiet day (a sign
 * they're deciding). Never throws; it runs after the beacon has been answered.
 */
export async function announceDocView(path: string, city: string | null, device: string | null) {
  try {
    const m = /^\/(invoice|proof)\/([^/]+)\/?$/.exec(path);
    if (!m) return;
    const [, kind, token] = m;
    const p = kind === "invoice" ? invoicePath(token) : proofPath(token);
    const views = await prisma.pageView.findMany({
      where: { path: { in: [p, p.replace(/\/$/, "")] }, ...(await notOwner()) },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { createdAt: true },
    });
    if (views.length === 0) return;
    const prior = views[1]?.createdAt ?? null;
    const DAY = 24 * 3600_000;
    if (prior && Date.now() - prior.getTime() < DAY) return; // same sitting, already told
    const again = !!prior;
    const where = [city, device].filter(Boolean).join(", ");
    const { notify, projectUrl } = await import("@/lib/notify");

    if (kind === "invoice") {
      const inv = await prisma.invoice.findUnique({
        where: { token },
        select: { number: true, type: true, status: true, deletedAt: true, projectId: true, clientId: true, client: { select: { name: true } } },
      });
      if (!inv || inv.deletedAt || inv.status === "DRAFT") return;
      const what = inv.type === "QUOTE" ? "quote" : "invoice";
      await notify({
        kind: "doc_viewed",
        title: `${inv.client.name} ${again ? "came back to" : "opened"} ${inv.number}`,
        body: `Their ${what}${where ? ` · ${where}` : ""}${again ? ` · last looked ${prior!.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ })}` : ""}`,
        url: projectUrl(inv.projectId),
        projectId: inv.projectId,
        clientId: inv.clientId,
        dedupeKey: again ? `doc_viewed:again:${token}:${chicagoDay(new Date())}` : `doc_viewed:first:${token}`,
      });
    } else {
      const proof = await prisma.proof.findUnique({
        where: { token },
        select: { id: true, title: true, projectId: true, project: { select: { clientId: true, client: { select: { name: true } } } } },
      });
      if (!proof) return;
      await notify({
        kind: "proof_viewed",
        title: `${proof.project.client.name} ${again ? "came back to" : "opened"} their proofs`,
        body: `${proof.title}${where ? ` · ${where}` : ""}`,
        url: `/admin/proofs/${proof.id}/`,
        projectId: proof.projectId,
        clientId: proof.project.clientId,
        dedupeKey: again ? `proof_viewed:again:${token}:${chicagoDay(new Date())}` : `proof_viewed:first:${token}`,
      });
    }
  } catch (e) {
    console.error("[announceDocView]", e);
  }
}
