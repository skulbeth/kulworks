import { prisma } from "@/lib/prisma";
import { fmtDateTime, toDateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export default async function AnalyticsPage() {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since14 = new Date(now.getTime() - 13 * DAY);
  since14.setHours(0, 0, 0, 0);

  const [total, last7, sessions, topPages, topReferrers, devices, rangeViews, recent] =
    await Promise.all([
      prisma.pageView.count(),
      prisma.pageView.count({ where: { createdAt: { gte: since7 } } }),
      prisma.pageView.groupBy({ by: ["sessionId"], where: { sessionId: { not: null } } }),
      prisma.pageView.groupBy({
        by: ["path"],
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({ by: ["device"], _count: { device: true } }),
      prisma.pageView.findMany({
        where: { createdAt: { gte: since14 } },
        select: { createdAt: true },
      }),
      prisma.pageView.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

  // Bucket the last 14 days.
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    days.push({
      key: toDateInput(d),
      label: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      count: 0,
    });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const v of rangeViews) {
    const b = byKey.get(toDateInput(v.createdAt));
    if (b) b.count++;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted">Cookieless page views from your website.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total views" value={total} />
        <Stat label="Views (last 7 days)" value={last7} />
        <Stat label="Unique visitors" value={sessions.length} />
      </div>

      {/* Last 14 days */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Last 14 days</h2>
        <div className="flex items-end gap-1.5 rounded-xl border border-border bg-surface p-4">
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-xs text-muted">{d.count || ""}</div>
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.round((d.count / maxDay) * 100)}px`, minHeight: "2px" }}
                title={`${d.label}: ${d.count}`}
              />
              <div className="text-[10px] text-muted">{d.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <TopList title="Top pages" rows={topPages.map((p) => ({ label: p.path, count: p._count.path }))} />
        <TopList
          title="Top referrers"
          rows={topReferrers.map((r) => ({ label: r.referrer ?? "—", count: r._count.referrer }))}
          empty="No external referrers yet."
        />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Devices</h2>
        <div className="flex flex-wrap gap-2">
          {devices.length === 0 ? (
            <p className="text-muted">No data yet.</p>
          ) : (
            devices.map((d) => (
              <span key={d.device ?? "?"} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
                {d.device ?? "unknown"}: <span className="font-bold">{d._count.device}</span>
              </span>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Recent visits</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-surface2 text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Page</th>
                <th className="px-3 py-2 font-semibold">Referrer</th>
                <th className="px-3 py-2 font-semibold">Device</th>
                <th className="px-3 py-2 font-semibold">Location</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No visits recorded yet.
                  </td>
                </tr>
              ) : (
                recent.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-3 py-2">{fmtDateTime(v.createdAt)}</td>
                    <td className="px-3 py-2">{v.path}</td>
                    <td className="px-3 py-2 text-muted">{v.referrer ?? "—"}</td>
                    <td className="px-3 py-2">{v.device ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">
                      {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-4xl font-extrabold">{value}</div>
    </div>
  );
}

function TopList({
  title,
  rows,
  empty = "No data yet.",
}: {
  title: string;
  rows: { label: string; count: number }[];
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-muted">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 font-bold">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
