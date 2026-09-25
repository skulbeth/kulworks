import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtText } from "@/lib/format";
import { createClientManual } from "../_actions";
import RecordExplorer, {
  type ExplorerColumn,
  type ExplorerItem,
} from "../_components/RecordExplorer";
import FilterTabs, { type FilterTab } from "../_components/FilterTabs";

export const dynamic = "force-dynamic";

const columns: ExplorerColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Why lost" },
  { key: "projects", label: "Projects" },
  { key: "since", label: "Since" },
];

const ADD_FIELD =
  "rounded-lg border border-border bg-surface2 px-3 py-2.5 text-base focus:border-blue focus:outline-none";

const VIEWS = ["clients", "contacts", "all"] as const;
type View = (typeof VIEWS)[number];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const view: View = VIEWS.includes(show as View) ? (show as View) : "clients";

  const [clients, clientCount, contactCount] = await Promise.all([
    prisma.client.findMany({
      where: view === "all" ? {} : { kind: view === "contacts" ? "CONTACT" : "CLIENT" },
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
    }),
    prisma.client.count({ where: { kind: "CLIENT" } }),
    prisma.client.count({ where: { kind: "CONTACT" } }),
  ]);

  const tabs: FilterTab[] = [
    { value: "", label: "Clients", count: clientCount },
    { value: "contacts", label: "Contacts", count: contactCount },
    { value: "all", label: "All", count: clientCount + contactCount },
  ];

  const items: ExplorerItem[] = clients.map((c) => {
    const isContact = c.kind === "CONTACT";
    return {
      id: c.id,
      title: c.name,
      subtitle: `${c.email}${c.company ? ` · ${c.company}` : ""}`,
      badge: isContact
        ? "Contact"
        : `${c._count.projects} project${c._count.projects === 1 ? "" : "s"}`,
      badgeTone: isContact ? "red" : "neutral",
      search: [c.name, c.email, c.phone, c.company, c.city, c.state, c.kind, c.lostReason, c.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      cells: {
        name: c.name,
        email: c.email,
        phone: fmtText(c.phone),
        company: fmtText(c.company),
        status: isContact ? "Contact" : "Client",
        reason: isContact ? fmtText(c.lostReason) : "-",
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

          {isContact && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Contact, not an active client
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {c.lostReason ?? "No reason recorded yet."}
              </p>
              {c.lostAt && (
                <p className="mt-1 text-xs text-muted">Moved to contacts {fmtDate(c.lostAt)}</p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">{c.email}</Field>
            <Field label="Phone">{fmtText(c.phone)}</Field>
            <Field label="Company">{fmtText(c.company)}</Field>
            <Field label="Address">
              {[c.street, c.city, c.state, c.postalCode, c.country]
                .filter(Boolean)
                .join(", ") || "-"}
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
                    <span className="font-semibold">{p.title}</span> · {p.stage}
                    {p.dueDate ? ` · due ${fmtDate(p.dueDate)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-sm text-muted">
            {c._count.submissions} form submission{c._count.submissions === 1 ? "" : "s"} ·{" "}
            {isContact ? "in the book" : "client"} since {fmtDate(c.createdAt)}
          </p>
        </div>
      ),
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">
        {view === "contacts" ? "Contacts" : view === "all" ? "Clients & contacts" : "Clients"}
      </h1>
      <p className="mb-4 text-muted">
        {view === "contacts"
          ? "Leads we didn't win, kept in the book with the reason why."
          : "Everyone who's reached out or become a customer."}
      </p>

      <FilterTabs basePath="/admin/clients/" param="show" tabs={tabs} active={view === "clients" ? "" : view} />

      <details className="mb-6 rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer select-none font-semibold text-blue">
          + Add a {view === "contacts" ? "contact" : "client"}
        </summary>
        <form action={createClientManual} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Name" className={ADD_FIELD} />
          <input name="email" type="email" required placeholder="Email" className={ADD_FIELD} />
          <input name="phone" type="tel" placeholder="Phone (optional)" className={ADD_FIELD} />
          <input name="company" placeholder="Company (optional)" className={ADD_FIELD} />
          <select name="kind" defaultValue={view === "contacts" ? "CONTACT" : "CLIENT"} className={ADD_FIELD}>
            <option value="CLIENT">Add as a client</option>
            <option value="CONTACT">Add as a contact (not a client)</option>
          </select>
          <input name="lostReason" placeholder="If a contact: why (optional)" className={ADD_FIELD} />
          <textarea name="notes" rows={2} placeholder="Notes (optional)" className={`${ADD_FIELD} sm:col-span-2`} />
          <button className="rounded-full bg-primary px-5 py-2.5 font-bold text-black hover:bg-primary-hover sm:col-span-2">
            Add
          </button>
        </form>
      </details>

      <RecordExplorer
        columns={columns}
        items={items}
        filename={view === "contacts" ? "kulworks-contacts" : "kulworks-clients"}
        emptyMessage={
          view === "contacts"
            ? "No contacts yet. Open a client and use “Move to contacts” when you don't win one."
            : "No clients yet."
        }
      />
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
