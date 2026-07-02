import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtMoney, fmtText } from "@/lib/format";
import RecordExplorer, {
  type ExplorerColumn,
  type ExplorerItem,
} from "../_components/RecordExplorer";

export const dynamic = "force-dynamic";

const columns: ExplorerColumn[] = [
  { key: "stage", label: "Stage" },
  { key: "title", label: "Project" },
  { key: "client", label: "Client" },
  { key: "due", label: "Due" },
  { key: "quoted", label: "Quoted" },
  { key: "final", label: "Final" },
];

const stageTone: Record<string, ExplorerItem["badgeTone"]> = {
  LEAD: "neutral",
  QUOTED: "gold",
  APPROVED: "blue",
  IN_PRODUCTION: "blue",
  DELIVERED: "green",
  CLOSED: "green",
  LOST: "red",
};

const stageLabel: Record<string, string> = {
  LEAD: "Lead",
  QUOTED: "Quoted",
  APPROVED: "Approved",
  IN_PRODUCTION: "In production",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  LOST: "Lost",
};

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      client: true,
      activities: { orderBy: { occurredAt: "desc" }, take: 20 },
    },
  });

  const items: ExplorerItem[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: `${p.client.name}${p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}`,
    badge: stageLabel[p.stage] ?? p.stage,
    badgeTone: stageTone[p.stage] ?? "neutral",
    search: [p.title, p.client.name, p.client.email, p.stage, p.requested, p.deliverables]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    cells: {
      stage: stageLabel[p.stage] ?? p.stage,
      title: p.title,
      client: p.client.name,
      due: fmtDate(p.dueDate),
      quoted: fmtMoney(p.quotedAmount),
      final: fmtMoney(p.finalAmount),
    },
    detail: (
      <div className="space-y-4">
        <Link
          href={`/admin/projects/${p.id}/`}
          className="inline-block text-sm font-semibold text-blue"
        >
          Open full view / edit →
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Requested">
            <p className="whitespace-pre-wrap">{fmtText(p.requested)}</p>
          </Field>
          <Field label="We'll provide">
            <p className="whitespace-pre-wrap">{fmtText(p.deliverables)}</p>
          </Field>
        </div>

        <Section title="Specs">
          <Field label="Card count">{fmtText(p.cardCount)}</Field>
          <Field label="Card size">{fmtText(p.cardSize)}</Field>
          <Field label="Quantity">{fmtText(p.quantity)}</Field>
          <Field label="Finish">{fmtText(p.finish)}</Field>
          <Field label="Notes">{fmtText(p.specsNotes)}</Field>
        </Section>

        <Section title="Money & time">
          <Field label="Quoted">{fmtMoney(p.quotedAmount)}</Field>
          <Field label="Final">{fmtMoney(p.finalAmount)}</Field>
          <Field label="Material cost">{fmtMoney(p.materialCost)}</Field>
          <Field label="Deposit paid">{fmtMoney(p.depositPaid)}</Field>
          <Field label="Dev hours">{fmtText(p.devHours)}</Field>
        </Section>

        <Section title="Dates">
          <Field label="Due">{fmtDate(p.dueDate)}</Field>
          <Field label="Start">{fmtDate(p.startDate)}</Field>
          <Field label="Delivery">{fmtDate(p.deliveryDate)}</Field>
        </Section>

        <Section title="Shipping">
          <Field label="Address">
            {[p.shipStreet, p.shipCity, p.shipState, p.shipPostalCode]
              .filter(Boolean)
              .join(", ") || "—"}
          </Field>
        </Section>

        <Field label="Client">
          {p.client.name} &lt;{p.client.email}&gt;
          {p.client.phone ? ` · ${p.client.phone}` : ""}
        </Field>

        {p.notes && (
          <Field label="Notes">
            <p className="whitespace-pre-wrap">{p.notes}</p>
          </Field>
        )}

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Activity ({p.activities.length})
          </div>
          {p.activities.length === 0 ? (
            <p className="text-muted">No activity logged yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {p.activities.map((a) => (
                <li key={a.id} className="rounded-lg bg-surface2 px-3 py-2">
                  <span className="font-semibold">{a.type}</span> —{" "}
                  <span className="whitespace-pre-wrap">{a.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    ),
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Projects</h1>
      <p className="mb-6 text-muted">Tracked jobs — pipeline, specs, costs, and dates.</p>
      <RecordExplorer columns={columns} items={items} filename="kulworks-projects" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 text-sm font-bold">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
