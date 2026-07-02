import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { updateClient, createProjectForClient } from "../../_actions";
import { TextField, TextArea, FieldGroup } from "../../_components/FormFields";
import AddActivity from "../../_components/AddActivity";
import SetReminder from "../../_components/SetReminder";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      submissions: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      activities: { where: { deletedAt: null }, orderBy: { occurredAt: "desc" }, take: 50 },
    },
  });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/clients/" className="text-sm font-semibold text-blue">
        ← Clients
      </Link>

      <h1 className="text-2xl font-bold">{client.name}</h1>

      <form action={updateClient} className="space-y-4">
        <input type="hidden" name="id" value={client.id} />
        <FieldGroup title="Contact">
          <TextField name="name" label="Name" defaultValue={client.name} />
          <TextField name="phone" label="Phone" defaultValue={client.phone} />
          <TextField name="company" label="Company" defaultValue={client.company} />
        </FieldGroup>
        <FieldGroup title="Address">
          <TextField name="street" label="Street" defaultValue={client.street} />
          <TextField name="city" label="City" defaultValue={client.city} />
          <TextField name="state" label="State" defaultValue={client.state} />
          <TextField name="postalCode" label="ZIP" defaultValue={client.postalCode} />
          <TextField name="country" label="Country" defaultValue={client.country} />
        </FieldGroup>
        <TextArea name="notes" label="Notes" defaultValue={client.notes} rows={3} />
        <p className="text-sm text-muted">
          {client.email} · client since {fmtDate(client.createdAt)}
          {" · "}
          {client.submissions.length} submission{client.submissions.length === 1 ? "" : "s"}
        </p>
        <button className="rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover">
          Save client
        </button>
      </form>

      {/* Projects */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Projects ({client.projects.length})</h2>
          <form action={createProjectForClient} className="flex items-center gap-2">
            <input type="hidden" name="clientId" value={client.id} />
            <input
              name="title"
              placeholder="New project title…"
              className="rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm focus:border-blue focus:outline-none"
            />
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
              + Add
            </button>
          </form>
        </div>
        {client.projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}/`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface2 px-3 py-2 text-sm hover:bg-surface2/60"
                >
                  <span className="font-semibold">{p.title}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                    {p.stage}
                  </span>
                  {p.dueDate && (
                    <span className="ml-auto text-xs text-gold">Due {fmtDate(p.dueDate)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Activity */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Activity &amp; reminders</h2>
        <AddActivity clientId={client.id} />
        <div className="mt-2">
          <SetReminder clientId={client.id} />
        </div>
        <ul className="mt-4 space-y-2">
          {client.activities.length === 0 ? (
            <li className="text-sm text-muted">No activity yet.</li>
          ) : (
            client.activities.map((a) => (
              <li key={a.id} className="rounded-lg bg-surface2 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{a.type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted">{fmtDateTime(a.occurredAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap">{a.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
