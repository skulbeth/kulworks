import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtText } from "@/lib/format";
import RecordExplorer, {
  type ExplorerColumn,
  type ExplorerItem,
} from "../_components/RecordExplorer";

export const dynamic = "force-dynamic";

const columns: ExplorerColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "projects", label: "Projects" },
  { key: "since", label: "Since" },
];

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      projects: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      _count: {
        select: {
          submissions: { where: { deletedAt: null } },
          projects: { where: { deletedAt: null } },
        },
      },
    },
  });

  const items: ExplorerItem[] = clients.map((c) => ({
    id: c.id,
    title: c.name,
    subtitle: `${c.email}${c.company ? ` · ${c.company}` : ""}`,
    badge: `${c._count.projects} project${c._count.projects === 1 ? "" : "s"}`,
    badgeTone: "neutral",
    search: [c.name, c.email, c.phone, c.company, c.city, c.state]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    cells: {
      name: c.name,
      email: c.email,
      phone: fmtText(c.phone),
      company: fmtText(c.company),
      projects: String(c._count.projects),
      since: fmtDate(c.createdAt),
    },
    detail: (
      <div className="space-y-4">
        <Link
          href={`/admin/clients/${c.id}/`}
          className="inline-block text-sm font-semibold text-blue"
        >
          Open full view / edit →
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email">{c.email}</Field>
          <Field label="Phone">{fmtText(c.phone)}</Field>
          <Field label="Company">{fmtText(c.company)}</Field>
          <Field label="Address">
            {[c.street, c.city, c.state, c.postalCode, c.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </Field>
        </div>

        {c.notes && (
          <Field label="Notes">
            <p className="whitespace-pre-wrap">{c.notes}</p>
          </Field>
        )}

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Projects ({c.projects.length})
          </div>
          {c.projects.length === 0 ? (
            <p className="text-muted">No projects yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {c.projects.map((p) => (
                <li key={p.id} className="rounded-lg bg-surface2 px-3 py-2">
                  <span className="font-semibold">{p.title}</span> — {p.stage}
                  {p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-muted">
          {c._count.submissions} form submission{c._count.submissions === 1 ? "" : "s"} · client
          since {fmtDate(c.createdAt)}
        </p>
      </div>
    ),
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Clients</h1>
      <p className="mb-6 text-muted">Everyone who&apos;s reached out or become a customer.</p>
      <RecordExplorer columns={columns} items={items} filename="kulworks-clients" />
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
