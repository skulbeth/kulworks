import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import { getOwnerHashes } from "@/lib/owner-visits";

const DAY = 24 * 60 * 60 * 1000;

function pct(cur: number, prev: number): string {
  if (prev === 0) return cur > 0 ? "▲ new" : "—";
  const d = Math.round(((cur - prev) / prev) * 100);
  if (d === 0) return "no change vs last week";
  return `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}% vs last week`;
}

function classifyChannel(ref: string | null): "Direct" | "Search" | "Social" | "Referral" | "Internal" {
  if (!ref) return "Direct";
  let host = ref.toLowerCase();
  try {
    host = new URL(ref).hostname.toLowerCase();
  } catch {
    /* keep raw */
  }
  if (host.includes("kulworks")) return "Internal";
  if (["google.", ".google", "bing.", "duckduckgo", "yahoo.", "ecosia", "yandex", "baidu", "startpage"].some((s) => host.includes(s)))
    return "Search";
  if (
    ["facebook.", "fb.", "instagram", "t.co", "twitter", "x.com", "tiktok", "pinterest", "reddit", "linkedin", "youtube", "youtu.be", "discord", "threads."].some(
      (s) => host.includes(s)
    )
  )
    return "Social";
  return "Referral";
}

/** Builds and emails the weekly site-stats digest to the admin. Excludes the owner's own visits. */
export async function sendWeeklyStatsEmail() {
  const now = Date.now();
  const weekStart = new Date(now - 7 * DAY);
  const prevStart = new Date(now - 14 * DAY);

  const ownerHashes = await getOwnerHashes();
  const notOwner = ownerHashes.length
    ? { OR: [{ visitorHash: { notIn: ownerHashes } }, { visitorHash: null }] }
    : {};
  const thisWeek = { createdAt: { gte: weekStart }, ...notOwner };
  const lastWeek = { createdAt: { gte: prevStart, lt: weekStart }, ...notOwner };

  const [
    views,
    prevViews,
    visitorGroups,
    prevVisitorGroups,
    sessionGroups,
    prevSessionGroups,
    beforeHashes,
    topPages,
    referrerGroups,
    directCount,
    topCities,
    newSubs,
    newSubmissions,
    totalViewsAll,
    totalSubsAll,
    trendRows,
  ] = await Promise.all([
    prisma.pageView.count({ where: thisWeek }),
    prisma.pageView.count({ where: lastWeek }),
    prisma.pageView.groupBy({ by: ["visitorHash"], where: { ...thisWeek, visitorHash: { not: null } }, _count: { visitorHash: true } }),
    prisma.pageView.groupBy({ by: ["visitorHash"], where: { ...lastWeek, visitorHash: { not: null } }, _count: { visitorHash: true } }),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { ...thisWeek, sessionId: { not: null } }, _count: { sessionId: true } }),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { ...lastWeek, sessionId: { not: null } }, _count: { sessionId: true } }),
    prisma.pageView.groupBy({ by: ["visitorHash"], where: { createdAt: { lt: weekStart }, visitorHash: { not: null }, ...notOwner }, _count: { visitorHash: true } }),
    prisma.pageView.groupBy({ by: ["path"], where: thisWeek, _count: { path: true }, orderBy: { _count: { path: "desc" } }, take: 5 }),
    prisma.pageView.groupBy({ by: ["referrer"], where: { ...thisWeek, referrer: { not: null } }, _count: { referrer: true }, orderBy: { _count: { referrer: "desc" } }, take: 100 }),
    prisma.pageView.count({ where: { ...thisWeek, referrer: null } }),
    prisma.pageView.groupBy({ by: ["city"], where: { ...thisWeek, city: { not: null } }, _count: { city: true }, orderBy: { _count: { city: "desc" } }, take: 3 }),
    prisma.subscriber.findMany({ where: { createdAt: { gte: weekStart }, unsubscribedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.submission.findMany({ where: { createdAt: { gte: weekStart }, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.pageView.count(),
    prisma.subscriber.count({ where: { unsubscribedAt: null } }),
    prisma.pageView.findMany({ where: thisWeek, select: { createdAt: true } }),
  ]);

  const uniqueVisitors = visitorGroups.length;
  const sessions = sessionGroups.length;
  const beforeSet = new Set(beforeHashes.map((g) => g.visitorHash));
  const returning = visitorGroups.filter((g) => beforeSet.has(g.visitorHash)).length;
  const newVisitors = uniqueVisitors - returning;

  const channels: Record<"Direct" | "Search" | "Social" | "Referral", number> = {
    Direct: directCount,
    Search: 0,
    Social: 0,
    Referral: 0,
  };
  for (const g of referrerGroups) {
    const c = classifyChannel(g.referrer);
    if (c === "Internal") continue;
    channels[c] += g._count.referrer;
  }

  // Busiest day of the week (San Antonio time).
  const byDay = new Map<string, number>();
  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Chicago" });
  for (const v of trendRows) {
    const d = dayFmt.format(v.createdAt);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  let busiest = "—";
  let busiestN = 0;
  for (const [d, n] of byDay) if (n > busiestN) { busiest = d; busiestN = n; }

  const dm = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
  const range = `${dm.format(weekStart)} – ${dm.format(new Date(now))}`;

  const lines: string[] = [
    `Kulworks weekly stats — ${range}`,
    "",
    "VISITORS  (real people; your own visits excluded)",
    `• Unique visitors: ${uniqueVisitors}   (${pct(uniqueVisitors, prevVisitorGroups.length)})`,
    `• Visits / sessions: ${sessions}   (${pct(sessions, prevSessionGroups.length)})`,
    `• Page views: ${views}   (${pct(views, prevViews)})`,
    `• New vs returning: ${newVisitors} new, ${returning} returning`,
    "",
    "WHERE & WHAT",
    `• Traffic sources: Direct ${channels.Direct} · Search ${channels.Search} · Social ${channels.Social} · Referral ${channels.Referral}`,
  ];
  if (topCities.length) lines.push(`• Top locations: ${topCities.map((c) => `${c.city} (${c._count.city})`).join(", ")}`);
  if (topPages.length) {
    lines.push("• Top pages:");
    topPages.forEach((p) => lines.push(`   - ${p.path} (${p._count.path})`));
  }
  if (busiestN) lines.push(`• Busiest day: ${busiest} (${busiestN} views)`);

  lines.push("", `NEW SUBSCRIBERS this week: ${newSubs.length}`);
  if (newSubs.length) newSubs.forEach((s) => lines.push(`   - ${s.email}`));

  lines.push("", `NEW LEADS (quote requests) this week: ${newSubmissions.length}`);
  if (newSubmissions.length)
    newSubmissions.forEach((s) => lines.push(`   - ${s.name} <${s.email}>${s.projectType ? ` — ${s.projectType}` : ""}`));

  lines.push(
    "",
    `All-time: ${totalSubsAll} subscribers · ${totalViewsAll} total page views.`,
    "",
    `Full dashboard: ${site.url}/admin/analytics/`,
    "— Kulworks admin"
  );

  await sendMail({
    to: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
    subject: `Kulworks weekly stats — ${uniqueVisitors} visitor${uniqueVisitors === 1 ? "" : "s"}, ${newSubs.length} new subscriber${newSubs.length === 1 ? "" : "s"}`,
    text: lines.join("\n"),
  });

  return { uniqueVisitors, views, sessions, newSubs: newSubs.length, newLeads: newSubmissions.length };
}
