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
  searchParams: Promise<{ range?: string; exclude?: string }>;
}) {
  const sp = await searchParams;
  const range = (RANGES.find((r) => r.key === sp.range)?.key ?? "30d") as RangeKey;
  const rangeMs = RANGES.find((r) => r.key === range)!.ms;
  const now = new Date();
  const since = rangeMs ? new Date(now.getTime() - rangeMs) : null;
  const inRange = since ? { createdAt: { gte: since } } : {};

  // Identify the admin's own traffic (current IP) so we can flag/exclude it.
  const myHash = visitorHash(ipFromHeaders(await headers()));
  const excludeMe = sp.exclude === "me" && !!myHash;
  // Keep rows with no visitorHash (real visitors can lack one); only drop MY hash.
  const notMe = excludeMe
    ? { OR: [{ visitorHash: { not: myHash } }, { visitorHash: null }] }
    : {};
  const baseWhere = { ...inRange, ...notMe };

  // Previous equal-length period (for period-over-period change). None for "all".
  const hasPrev = !!(since && rangeMs);
  const prevSince = hasPrev ? new Date(since!.getTime() - rangeMs!) : null;
  const prevWhere = hasPrev
    ? { createdAt: { gte: prevSince!, lt: since! }, ...notMe }
    : null;

  const [
    totalAll,
    rangeViews,
    visitorGroups,
    sessionGroups,
    yourViews,
    topPages,
    topCountries,
    topCities,
    referrerGroups,
    directCount,
    devices,
    trendRows,
    recent,
    prevViews,
    prevVisitorGroups,
    prevSessionGroups,
    beforeHashes,
  ] = await Promise.all([
    prisma.pageView.count(),
    prisma.pageView.count({ where: baseWhere }),
    prisma.pageView.groupBy({
      by: ["visitorHash"],
      where: { ...baseWhere, visitorHash: { not: null } },
      _count: { visitorHash: true },
    }),
    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: { ...baseWhere, sessionId: { not: null } },
      _count: { sessionId: true },
    }),
    myHash
      ? prisma.pageView.count({ where: { ...inRange, visitorHash: myHash } })
      : Promise.resolve(0),
    prisma.pageView.groupBy({
      by: ["path"],
      where: baseWhere,
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 20,
    }),
    prisma.pageView.groupBy({
      by: ["country"],
      where: { ...baseWhere, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 12,
    }),
    prisma.pageView.groupBy({
      by: ["city"],
      where: { ...baseWhere, city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 12,
    }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: { ...baseWhere, referrer: { not: null } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 100,
    }),
    prisma.pageView.count({ where: { ...baseWhere, referrer: null } }),
    prisma.pageView.groupBy({ by: ["device"], where: baseWhere, _count: { device: true } }),
    prisma.pageView.findMany({
      where: { ...(since ? { createdAt: { gte: since } } : { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } }), ...notMe },
      select: { createdAt: true },
    }),
    prisma.pageView.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, createdAt: true, path: true, referrer: true, device: true, city: true, country: true, visitorHash: true },
    }),
    prevWhere ? prisma.pageView.count({ where: prevWhere }) : Promise.resolve(0),
    prevWhere
      ? prisma.pageView.groupBy({ by: ["visitorHash"], where: { ...prevWhere, visitorHash: { not: null } }, _count: { visitorHash: true } })
      : Promise.resolve([] as { visitorHash: string | null }[]),
    prevWhere
      ? prisma.pageView.groupBy({ by: ["sessionId"], where: { ...prevWhere, sessionId: { not: null } }, _count: { sessionId: true } })
      : Promise.resolve([] as { sessionId: string | null }[]),
    since
      ? prisma.pageView.groupBy({ by: ["visitorHash"], where: { createdAt: { lt: since }, visitorHash: { not: null }, ...notMe }, _count: { visitorHash: true } })
      : Promise.resolve([] as { visitorHash: string | null }[]),
  ]);

  const uniqueVisitors = visitorGroups.length;
  const uniqueExcludingYou =
    uniqueVisitors - (myHash && !excludeMe && visitorGroups.some((g) => g.visitorHash === myHash) ? 1 : 0);
  const sessions = sessionGroups.length;
  const multiPageSessions = sessionGroups.filter((g) => (g._count.sessionId ?? 0) > 1).length;
  const pagesPerSession = sessions ? rangeViews / sessions : 0;
  const geoKnown = topCountries.reduce((s, c) => s + c._count.country, 0);

  // New vs. returning (returning = seen before this range started).
  const beforeSet = new Set(beforeHashes.map((g) => g.visitorHash));
  const returningVisitors = visitorGroups.filter((g) => beforeSet.has(g.visitorHash)).length;
  const newVisitors = uniqueVisitors - returningVisitors;

  // Traffic channels: Direct / Search / Social / Referral (internal on-site nav excluded).
  const channels = { Direct: directCount, Search: 0, Social: 0, Referral: 0 };
  let internalRefs = 0;
  for (const g of referrerGroups) {
    const c = classifyReferrer(g.referrer ?? "");
    if (c === "Internal") internalRefs += g._count.referrer;
    else channels[c] += g._count.referrer;
  }
  const topReferrers = referrerGroups.slice(0, 10);

  // Change vs. previous period.
  const prevUnique = prevVisitorGroups.length;
  const prevSessions = prevSessionGroups.length;
  const viewsChange = hasPrev ? pctChange(rangeViews, prevViews) : null;
  const sessionsChange = hasPrev ? pctChange(sessions, prevSessions) : null;
  const visitorsChange = hasPrev ? pctChange(uniqueVisitors, prevUnique) : null;

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
  const peak = buckets.reduce((a, b) => (b.count > a.count ? b : a), buckets[0] ?? { label: "", count: 0 });

  // When people visit: by day of week, in San Antonio (Central) time.
  const dow = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
  const dowFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Chicago" });
  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const v of trendRows) {
    const idx = DOW_LABELS.indexOf(dowFmt.format(v.createdAt));
    if (idx >= 0) dow[idx]++;
  }
  const maxDow = Math.max(1, ...dow);

  const rLabel = rangeLabel(range);
  const topCity = topCities[0]?.city ?? null;
  const topPagePath = topPages[0]?.path ?? null;

  const excludeHref = (r: RangeKey, ex: boolean) =>
    `/admin/analytics/?range=${r}${ex ? "&exclude=me" : ""}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted">Cookieless page views from your website.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Hide-my-visits toggle */}
          {myHash && (
            <Link
              href={excludeHref(range, !excludeMe)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                excludeMe
                  ? "bg-blue text-white"
                  : "border border-border bg-surface text-muted hover:border-blue hover:text-blue"
              }`}
              title="Filter your own visits out of every section below"
            >
              {excludeMe ? "✓ Hiding my visits" : "Hide my visits"}
            </Link>
          )}
          {/* Date range filter */}
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={excludeHref(r.key, excludeMe)}
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
      </div>

      {/* Plain-English summary */}
      <div className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed">
        {rangeViews === 0 ? (
          <p className="text-muted">No visits in this range yet{excludeMe ? " (excluding your own)" : ""}.</p>
        ) : (
          <p>
            In the last <span className="font-semibold">{rLabel}</span>,{" "}
            <span className="font-bold">{uniqueVisitors}</span> {uniqueVisitors === 1 ? "person" : "people"}{" "}
            visited <span className="font-bold">{sessions || rangeViews}</span>{" "}
            {sessions ? (sessions === 1 ? "time" : "times") : "times"}
            {topCity ? <> , mostly from <span className="font-semibold">{topCity}</span></> : null}
            {topPagePath ? <> , landing most on <span className="font-mono text-xs">{topPagePath}</span></> : null}.
            {peak.count > 0 && <> Busiest {hourly ? "hour" : "day"}: <span className="font-semibold">{peak.label}</span> ({peak.count}).</>}
            {excludeMe && <span className="text-muted"> Your own visits are hidden.</span>}
          </p>
        )}
      </div>

      {/* "Is it you?" helper (only when not already hiding yourself) */}
      {!excludeMe && (
        <div className="rounded-xl border border-blue/30 bg-blue/5 p-4 text-sm">
          {myHash ? (
            <p>
              <span className="font-semibold text-blue">Telling real visitors from you:</span> your
              current device shows up as visitor{" "}
              <code className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-xs">{myHash.slice(-6)}</code>
              . In this range you account for <span className="font-bold">{yourViews}</span> view
              {yourViews === 1 ? "" : "s"}. Excluding you, there {uniqueExcludingYou === 1 ? "is" : "are"}{" "}
              <span className="font-bold">{uniqueExcludingYou}</span> unique visitor
              {uniqueExcludingYou === 1 ? "" : "s"}.{" "}
              <Link href={excludeHref(range, true)} className="font-semibold text-blue hover:underline">
                Hide my visits everywhere →
              </Link>
            </p>
          ) : (
            <p className="text-muted">
              Visitor identity uses a salted hash of the IP (we never store the raw IP). Your own
              hash isn&apos;t available here (no IP header in this environment), but unique-visitor
              counts below still distinguish separate people once real traffic comes in.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Views (${rLabel})`} value={rangeViews} change={viewsChange} hint={`all-time: ${totalAll}`} />
        <Stat label="Visits (sessions)" value={sessions} change={sessionsChange} hint={`${pagesPerSession.toFixed(1)} pages per visit`} />
        <Stat label="Unique visitors" value={uniqueVisitors} change={visitorsChange} hint="distinct people (by IP hash)" />
        <Stat
          label="Multi-page visits"
          value={multiPageSessions}
          highlight
          hint={sessions ? `${Math.round((multiPageSessions / sessions) * 100)}% browsed more than one page` : "sessions with 2+ pages"}
        />
      </div>

      {/* Visitor mix: new vs returning */}
      <section>
        <h2 className="mb-3 text-lg font-bold">New vs. returning visitors</h2>
        {uniqueVisitors === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-muted">No visitors in this range yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <MixCard label="New visitors" value={newVisitors} total={uniqueVisitors} tone="primary" note="first time we've seen them" />
            <MixCard label="Returning visitors" value={returningVisitors} total={uniqueVisitors} tone="blue" note="seen before this range" />
          </div>
        )}
        {range === "all" && (
          <p className="mt-2 text-xs text-muted">New vs. returning is most meaningful on a bounded range (everyone looks &quot;new&quot; on All time).</p>
        )}
      </section>

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

      {/* Where from: channels */}
      <section>
        <h2 className="mb-1 text-lg font-bold">Where your traffic comes from</h2>
        <p className="mb-3 text-xs text-muted">
          How people arrived. Direct = typed the URL or a bookmark; Search = Google/Bing; Social =
          Facebook/Instagram/etc; Referral = another website linked to you.
          {internalRefs > 0 && <> ({internalRefs} on-site navigations not counted here.)</>}
        </p>
        <TopList
          title=""
          rows={(["Direct", "Search", "Social", "Referral"] as const).map((k) => ({ label: k, count: channels[k] }))}
          empty="No traffic yet."
        />
      </section>

      {/* Where from: geo */}
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
          title="Referrer details"
          rows={topReferrers.map((r) => ({ label: r.referrer ?? "—", count: r._count.referrer }))}
          empty="No external referrers yet (people typing the URL or visiting directly show none)."
        />
      </div>

      {/* When people visit */}
      <section>
        <h2 className="mb-1 text-lg font-bold">When people visit</h2>
        <p className="mb-3 text-xs text-muted">Views by day of week (San Antonio time).</p>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface p-4">
          {DOW_LABELS.map((lbl, i) => (
            <div key={lbl} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-[10px] text-muted">{dow[i] || ""}</div>
              <div
                className="w-full rounded-t bg-blue"
                style={{ height: `${Math.round((dow[i] / maxDow) * 80)}px`, minHeight: "2px" }}
                title={`${lbl}: ${dow[i]}`}
              />
              <div className="text-[10px] text-muted">{lbl}</div>
            </div>
          ))}
        </div>
      </section>

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

type Change = { dir: "up" | "down" | "flat"; pct: number | null };

function pctChange(cur: number, prev: number): Change {
  if (prev === 0) return { dir: cur > 0 ? "up" : "flat", pct: null };
  const diff = ((cur - prev) / prev) * 100;
  return { dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat", pct: Math.abs(Math.round(diff)) };
}

function ChangeLine({ change }: { change: Change }) {
  const { dir, pct } = change;
  const color = dir === "up" ? "text-green-600" : dir === "down" ? "text-red-600" : "text-muted";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  const text =
    pct === null
      ? dir === "up"
        ? "↑ new vs. prev period"
        : "no change vs. prev period"
      : `${arrow} ${pct}% vs. prev period`;
  return <div className={`mt-1 text-xs font-semibold ${color}`}>{text}</div>;
}

function Stat({
  label,
  value,
  hint,
  change,
  highlight = false,
}: {
  label: string;
  value: number;
  hint?: string;
  change?: Change | null;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-blue/40 bg-blue/5" : "border-border bg-surface"}`}>
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-4xl font-extrabold">{value}</div>
      {change && <ChangeLine change={change} />}
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

function MixCard({
  label,
  value,
  total,
  note,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  note: string;
  tone: "primary" | "blue";
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const bar = tone === "blue" ? "bg-blue" : "bg-primary";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="text-sm font-bold">{pct}%</div>
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
      <div className="mt-2 h-2 rounded-full bg-surface2">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted">{note}</div>
    </div>
  );
}

function classifyReferrer(ref: string): "Search" | "Social" | "Referral" | "Internal" | "Direct" {
  const raw = ref.trim();
  if (!raw) return "Direct";
  let host = raw.toLowerCase();
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    /* keep raw lowercase */
  }
  if (host.includes("kulworks")) return "Internal";
  const search = ["google.", ".google", "bing.", "duckduckgo", "yahoo.", "ecosia", "yandex", "baidu", "search.brave", "startpage"];
  const social = [
    "facebook.", "fb.", "instagram", "l.instagram", "t.co", "twitter", "x.com", "tiktok",
    "pinterest", "reddit", "linkedin", "youtube", "youtu.be", "whatsapp", "discord", "snapchat", "threads.",
  ];
  if (search.some((s) => host.includes(s))) return "Search";
  if (social.some((s) => host.includes(s))) return "Social";
  return "Referral";
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
      {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
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
