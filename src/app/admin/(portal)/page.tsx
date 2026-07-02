import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { completeReminder } from "./_actions";

export const dynamic = "force-dynamic";

const ACTIVE_STAGES = ["LEAD", "QUOTED", "APPROVED", "IN_PRODUCTION"] as const;

export default async function DashboardPage() {
  const now = new Date();
  const [newSubs, activeProjects, clientCount, reminders, upcoming, recentSubs] =
    await Promise.all([
      prisma.submission.count({ where: { status: "NEW" } }),
      prisma.project.count({ where: { stage: { in: [...ACTIVE_STAGES] } } }),
      prisma.client.count(),
      prisma.activity.findMany({
        where: { type: "REMINDER", done: false, remindAt: { not: null } },
        orderBy: { remindAt: "asc" },
        take: 12,
        include: { project: true, client: true },
      }),
      prisma.project.findMany({
        where: { stage: { in: [...ACTIVE_STAGES] }, dueDate: { not: null } },
        orderBy: { dueDate: "asc" },
        take: 8,
        include: { client: true },
      }),
      prisma.submission.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="New submissions" value={newSubs} href="/admin/submissions/" />
        <Stat label="Active projects" value={activeProjects} href="/admin/projects/" />
        <Stat label="Clients" value={clientCount} href="/admin/clients/" />
      </div>

      {/* Reminders */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Reminders</h2>
        {reminders.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-muted">
            No open reminders. Set one on any project or client.
          </p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => {
              const overdue = r.remindAt ? new Date(r.remindAt) < now : false;
              const href = r.projectId
                ? `/admin/projects/${r.projectId}/`
                : r.clientId
                  ? `/admin/clients/${r.clientId}/`
                  : null;
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 ${
                    overdue ? "border-red-500/40 bg-red-500/5" : "border-border bg-surface"
                  }`}
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      overdue ? "bg-red-500/15 text-red-600" : "bg-gold/15 text-gold"
                    }`}
                  >
                    {overdue ? "Overdue" : "Reminder"}
                  </span>
                  <span className="min-w-0 flex-1">
                    {href ? (
                      <Link href={href} className="hover:text-blue">
                        {r.body}
                      </Link>
                    ) : (
                      r.body
                    )}
                  </span>
                  <span className="text-sm text-muted">{fmtDate(r.remindAt)}</span>
                  <form action={completeReminder}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-blue hover:text-blue">
                      Done
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Upcoming due dates */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Upcoming due dates</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-muted">
            No active projects with due dates yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}/`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 hover:border-blue"
                >
                  <span className="font-semibold">{p.title}</span>
                  <span className="text-sm text-muted">{p.client.name}</span>
                  <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold text-muted">
                    {p.stage}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-gold">
                    Due {fmtDate(p.dueDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent submissions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent submissions</h2>
          <Link href="/admin/submissions/" className="text-sm font-semibold text-blue">
            View all →
          </Link>
        </div>
        {recentSubs.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-muted">
            No submissions yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentSubs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/submissions/?open=${s.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 hover:border-blue"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-sm text-muted">{s.email}</span>
                  <span className="ml-auto text-sm text-muted">{fmtDateTime(s.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-blue"
    >
      <div className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-4xl font-extrabold">{value}</div>
    </Link>
  );
}
