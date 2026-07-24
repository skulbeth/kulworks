import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDateTime, toDateInput } from "@/lib/format";
import { ipFromHeaders, visitorHash } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

type RangeKey = "24h" | "7d" | "30d" | "90d" | "all";
const RANGES: { key: RangeKey; label: string; ms: number | null }[] = [
  { key: "24h", label: "24 hours", ms: DAY },
  { key: "7d", label: "7 days", ms: 7 * DAY },
  { key: "30d", label: "30 days", ms: 30 * DAY },
  { key: "90d", label: "90 days", ms: 90 * DAY },
  { key: "all", label: "All time", ms: null },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = (RANGES.find((r) => r.key === sp.range)?.key ?? "30d") as RangeKey;
  const rangeMs = RANGES.find((r) => r.key === range)!.ms;
  const now = new Date();
  const since = rangeMs ? new Date(now.getTime() - rangeMs) : null;
  const inRange = since ? { createdAt: { gte: since } } : {};

  // Identify the admin's own traffic (current IP) so we can flag/exclude it.
  const myHash = visitorHash(ipFromHeaders(await headers()));

  const [
    totalAll,
    rangeViews,
    visitorGroups,
    yourViews,
    topPages,
    topCountries,
    topCities,
    topReferrers,
    devices,
    trendRows,
    recent,
  ] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({ where: inRange }),
    prisma.pageView.groupBy({
      by: ["visitorHash"],
      where: { ...inRange, visitorHash: { not: null } },
      _count: { visitorHash: true },
    }),
    myHash
      ? prisma.pageView.count({ where: { ...inRange, visitorHash: myHash } })
      : Promise.resolve(0),
    prisma.pageView.groupBy({
      by: ["path"],
      where: inRange,
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 20,
    }),
    prisma.pageView.groupBy({
      by: ["country"],
      where: { ...inRange, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 12,
    }),
    prisma.pageView.groupBy({
      by: ["city"],
      where: { ...inRange, city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 12,
    }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: { ...inRange, referrer: { not: null } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 10,
    }),
    prisma.pageView.groupBy({ by: ["device"], where: inRange, _count: { device: true } }),
    prisma.pageView.findMany({
      where: since ? { createdAt: { gte: since } } : { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } },
      select: { createdAt: true },
    }),
    prisma.pageView.findMany({
      where: inRange,
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, createdAt: true, path: true, referrer: true, device: true, city: true, country: true, visitorHash: true },
    }),
  ]);

  const uniqueVisitors = visitorGroups.length;
  const uniqueExcludingYou =
    uniqueVisitors - (myHash && visitorGroups.some((g) => g.visitorHash === myHash) ? 1 : 0);
  const geoKnown = topCountries.reduce((s, c) => s + c._count.country, 0);

  // Trend: hourly for 24h, otherwise daily.
  const hourly = range === "24h";
  const buckets: { key: string; label: string; count: number }[] = [];
  if (hourly) {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * HOUR);
      buckets.push({ key: hourKey(d), label: `${d.getHours()}`, count: 0 });
    }
  } else {
    const spanDays = rangeMs ? Math.min(Math.ceil(rangeMs / DAY), 45) : 30;
    for (let i = spanDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * DAY);
      buckets.push({
        key: toDateInput(d),
        label: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
        count: 0,
      });
    }
  }
  const bMap = new Map(buckets.map((b) => [b.key, b]));
  for (const v of trendRows) {
    const b = bMap.get(hourly ? hourKey(v.createdAt) : toDateInput(v.createdAt));
    if (b) b.count++;
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted">Cookieless page views from your website.</p>
        </div>
        {/* Date range filter */}
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/analytics/?range=${r.key}`}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                r.key === range
                  ? "bg-primary text-black"
                  : "border border-border bg-surface text-muted hover:border-blue hover:text-blue"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* "Is it you?" helper */}
      <div className="rounded-xl border border-blue/30 bg-blue/5 p-4 text-sm">
        {myHash ? (
          <p>
            <span className="font-semibold text-blue">Telling real visitors from you:</span> your
            current device shows up as visitor{" "}
            <code className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-xs">{myHash.slice(-6)}</code>
            . In this range you account for <span className="font-bold">{yourViews}</span> view
            {yourViews === 1 ? "" : "s"}. Excluding you, there {uniqueExcludingYou === 1 ? "is" : "are"}{" "}
            <span className="font-bold">{uniqueExcludingYou}</span> unique visitor
            {uniqueExcludingYou === 1 ? "" : "s"}.
          </p>
        ) : (
          <p className="text-muted">
            Visitor identity uses a salted hash of the IP (we never store the raw IP). Your own
            hash isn&apos;t available here (no IP header in this environment), but unique-visitor
            counts below still distinguish separate people once real traffic comes in.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Views (${rangeLabel(range)})`} value={rangeViews} />
        <Stat label="Unique visitors" value={uniqueVisitors} hint="distinct people (by IP hash)" />
        <Stat label="Unique, excluding you" value={uniqueExcludingYou} highlight />
        <Stat label="Total views (all time)" value={totalAll} />
      </div>

      {/* Trend */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{hourly ? "Last 24 hours" : "Daily views"}</h2>
        <div className="flex items-end gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-4">
          {buckets.map((b) => (
            <div key={b.key} className="flex min-w-[14px] flex-1 flex-col items-center gap-1">
              <div className="text-[10px] text-muted">{b.count || ""}</div>
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${Math.round((b.count / maxBucket) * 90)}px`, minHeight: "2px" }}
                title={`${b.label}: ${b.count}`}
              />
              <div className="text-[9px] text-muted">{b.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Where from */}
      <div className="grid gap-6 md:grid-cols-2">
        <TopList
          title="Top countries"
          rows={topCountries.map((c) => ({ label: c.country ?? "—", count: c._count.country }))}
          empty="No location data yet (it fills in from real production visits)."
        />
        <TopList
          title="Top cities"
          rows={topCities.map((c) => ({ label: c.city ?? "—", count: c._count.city }))}
          empty="No location data yet."
        />
      </div>
      {geoKnown === 0 && rangeViews > 0 && (
        <p className="-mt-4 text-xs text-muted">
          Location comes from the visitor&apos;s network via the host&apos;s edge headers, so it
          only appears for real visits to the live site (not local/dev traffic).
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <TopList title="Top pages" rows={topPages.map((p) => ({ label: p.path, count: p._count.path }))} />
        <TopList
          title="Top referrers"
          rows={topReferrers.map((r) => ({ label: r.referrer ?? "—", count: r._count.referrer }))}
          empty="No external referrers yet (people typing the URL or visiting directly show none)."
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
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-surface2 text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Visitor</th>
                <th className="px-3 py-2 font-semibold">Page</th>
                <th className="px-3 py-2 font-semibold">Location</th>
                <th className="px-3 py-2 font-semibold">Device</th>
                <th className="px-3 py-2 font-semibold">Referrer</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    No visits in this range.
                  </td>
                </tr>
              ) : (
                recent.map((v) => {
                  const isYou = myHash && v.visitorHash === myHash;
                  return (
                    <tr key={v.id} className={`border-t border-border ${isYou ? "bg-blue/5" : ""}`}>
                      <td className="whitespace-nowrap px-3 py-2">{fmtDateTime(v.createdAt)}</td>
                      <td className="px-3 py-2">
                        {v.visitorHash ? (
                          <code className="font-mono text-xs text-muted">{v.visitorHash.slice(-6)}</code>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {isYou && <span className="ml-1 text-xs font-bold text-blue">(you)</span>}
                      </td>
                      <td className="px-3 py-2">{v.path}</td>
                      <td className="px-3 py-2 text-muted">
                        {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2">{v.device ?? "—"}</td>
                      <td className="max-w-[16rem] truncate px-3 py-2 text-muted">{v.referrer ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function hourKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

function rangeLabel(r: RangeKey): string {
  return RANGES.find((x) => x.key === r)!.label.toLowerCase();
}

function Stat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: number;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-blue/40 bg-blue/5" : "border-border bg-surface"}`}>
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-4xl font-extrabold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
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
