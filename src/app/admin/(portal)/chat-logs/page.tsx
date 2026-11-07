import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/format";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Every question asked of the Role to Reign Rules Helper (roletoreign.com chatbot).
const DAY = 24 * 60 * 60 * 1000;
const RANGES = [
  { key: "24h", label: "24 hours", ms: DAY },
  { key: "7d", label: "7 days", ms: 7 * DAY },
  { key: "30d", label: "30 days", ms: 30 * DAY },
  { key: "all", label: "All time", ms: null },
] as const;
const VIEWS = [
  { key: "all", label: "All", outcomes: null },
  { key: "answered", label: "Answered", outcomes: ["answered"] },
  { key: "refused", label: "Refused", outcomes: ["refused_filter", "refused_topic", "refused_model", "filtered_answer"] },
  { key: "error", label: "Errors", outcomes: ["error"] },
] as const;
const OUTCOME_LABEL: Record<string, string> = {
  answered: "Answered",
  refused_filter: "Blocked (trick filter)",
  refused_topic: "Refused (off-topic)",
  refused_model: "Refused (by AI)",
  filtered_answer: "Answer blocked",
  error: "Error",
};

export default async function ChatLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; view?: string; q?: string }>;
}) {
  await requireProfile(); // not just the layout: a client navigation can skip it
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[2];
  const view = VIEWS.find((v) => v.key === sp.view) ?? VIEWS[0];
  const q = (sp.q ?? "").trim().slice(0, 100);
  const since = range.ms ? new Date(Date.now() - range.ms) : null;

  const base = since ? { createdAt: { gte: since } } : {};
  const where = {
    ...base,
    ...(view.outcomes ? { outcome: { in: [...view.outcomes] } } : {}),
    ...(q
      ? {
          OR: [
            { question: { contains: q, mode: "insensitive" as const } },
            { answer: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total, byOutcome, visitors] = await Promise.all([
    prisma.chatLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.chatLog.count({ where: base }),
    prisma.chatLog.groupBy({ by: ["outcome"], where: base, _count: true }),
    prisma.chatLog.findMany({ where: base, distinct: ["visitorHash"], select: { visitorHash: true } }),
  ]);
  const count = (o: string) => byOutcome.find((b) => b.outcome === o)?._count ?? 0;
  const refused = ["refused_filter", "refused_topic", "refused_model", "filtered_answer"].reduce((n, o) => n + count(o), 0);
  const href = (p: Record<string, string>) => {
    const s = new URLSearchParams({ range: range.key, view: view.key, ...(q ? { q } : {}), ...p });
    return `/admin/chat-logs/?${s.toString()}`;
  };
  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
      active ? "bg-primary text-black" : "border border-border bg-surface text-muted hover:border-blue hover:text-blue"
    }`;
  const stats: [string, number][] = [
    ["Questions", total],
    ["Answered", count("answered")],
    ["Refused / blocked", refused],
    ["Visitors", visitors.filter((v) => v.visitorHash).length],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rules Helper chats</h1>
          <p className="text-muted">
            Every question asked of the Role to Reign chatbot on roletoreign.com.{" "}
            <Link href="/admin/analytics/?site=roletoreign" className="text-blue hover:underline">
              Role to Reign analytics
            </Link>
          </p>
        </div>
        <a
          href={`/admin/chat-logs/export/?range=${range.key}`}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold hover:border-blue hover:text-blue"
        >
          Download ({range.label.toLowerCase()}) as JSON
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
            <div className="text-2xl font-bold">{n}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => (
          <Link key={r.key} href={href({ range: r.key })} className={pill(r.key === range.key)}>
            {r.label}
          </Link>
        ))}
        <span className="mx-2 text-muted">|</span>
        {VIEWS.map((v) => (
          <Link key={v.key} href={href({ view: v.key })} className={pill(v.key === view.key)}>
            {v.label}
          </Link>
        ))}
        <form action="/admin/chat-logs/" className="ml-auto flex gap-2">
          <input type="hidden" name="range" value={range.key} />
          <input type="hidden" name="view" value={view.key} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search questions and answers"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted">No chats in this range yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Question and answer</th>
                <th className="px-3 py-2">Visitor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{fmtDateTime(r.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={
                        r.outcome === "answered" ? "text-green-600" : r.outcome === "error" ? "text-red-500" : "text-amber-600"
                      }
                    >
                      {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                    </span>
                    {r.latencyMs != null && <div className="text-xs text-muted">{(r.latencyMs / 1000).toFixed(1)}s</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{r.question}</div>
                    {r.answer && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-muted">
                          Answer{r.turn > 1 ? ` (follow-up #${r.turn})` : ""}
                        </summary>
                        <div className="mt-1 whitespace-pre-wrap text-muted">{r.answer}</div>
                      </details>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                    {r.visitorHash ? <code className="font-mono">{r.visitorHash.slice(-6)}</code> : "-"}
                    {r.country && <div>{r.country}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length === 300 && <p className="text-xs text-muted">Showing the latest 300. Use Download for everything.</p>}
    </div>
  );
}
