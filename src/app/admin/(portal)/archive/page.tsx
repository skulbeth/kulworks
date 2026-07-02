import { prisma } from "@/lib/prisma";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import {
  restoreSubmission,
  restoreProject,
  restoreActivity,
  restorePayment,
} from "../_actions";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const [subs, projects, activities, payments] = await Promise.all([
    prisma.submission.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
    }),
    prisma.project.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { client: true },
      take: 100,
    }),
    prisma.activity.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
    }),
    prisma.payment.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
    }),
  ]);

  const empty =
    subs.length + projects.length + activities.length + payments.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Archive</h1>
        <p className="text-muted">Deleted items are kept here — restore anything anytime.</p>
      </div>

      {empty && (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          Nothing archived. Deleted items will show up here.
        </p>
      )}

      <Section title={`Submissions (${subs.length})`} show={subs.length > 0}>
        {subs.map((s) => (
          <Row
            key={s.id}
            label={`${s.name} <${s.email}>`}
            meta={`archived ${fmtDateTime(s.deletedAt)}`}
            action={restoreSubmission}
            id={s.id}
          />
        ))}
      </Section>

      <Section title={`Projects (${projects.length})`} show={projects.length > 0}>
        {projects.map((p) => (
          <Row
            key={p.id}
            label={`${p.title} — ${p.client.name}`}
            meta={`archived ${fmtDateTime(p.deletedAt)}`}
            action={restoreProject}
            id={p.id}
          />
        ))}
      </Section>

      <Section title={`Payments (${payments.length})`} show={payments.length > 0}>
        {payments.map((p) => (
          <Row
            key={p.id}
            label={`${fmtMoney(p.amount)} · ${p.method}`}
            meta={`archived ${fmtDateTime(p.deletedAt)}`}
            action={restorePayment}
            id={p.id}
          />
        ))}
      </Section>

      <Section title={`Activity (${activities.length})`} show={activities.length > 0}>
        {activities.map((a) => (
          <Row
            key={a.id}
            label={`${a.type.replace(/_/g, " ")}: ${a.body.slice(0, 60)}`}
            meta={`archived ${fmtDateTime(a.deletedAt)}`}
            action={restoreActivity}
            id={a.id}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  show,
  children,
}: {
  title: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Row({
  label,
  meta,
  action,
  id,
}: {
  label: string;
  meta: string;
  action: (formData: FormData) => void;
  id: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-muted">{meta}</span>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-blue hover:text-blue">
          Restore
        </button>
      </form>
    </li>
  );
}
