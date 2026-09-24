import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  updateClient,
  createProjectForClient,
  sendClientEmail,
  convertClientToContact,
  convertContactToClient,
  addActivity,
} from "../../_actions";
import { TextField, TextArea, FieldGroup } from "../../_components/FormFields";
import AddActivity from "../../_components/AddActivity";
import SetReminder from "../../_components/SetReminder";
import ConfirmButton from "../../_components/ConfirmButton";

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

  const isContact = client.kind === "CONTACT";
  const notes = client.activities.filter((a) => a.type === "NOTE");
  const otherActivity = client.activities.filter((a) => a.type !== "NOTE");

  return (
    <div className="space-y-6">
      <Link
        href={isContact ? "/admin/clients/?show=contacts" : "/admin/clients/"}
        className="text-sm font-semibold text-blue"
      >
        ← {isContact ? "Contacts" : "Clients"}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
            isContact ? "bg-red-500/15 text-red-600" : "bg-green-500/15 text-green-600"
          }`}
        >
          {isContact ? "Contact" : "Client"}
        </span>
      </div>

      {/* Status — client ⇄ contact */}
      <section
        className={`rounded-xl border p-4 ${
          isContact ? "border-red-500/30 bg-red-500/5" : "border-border bg-surface"
        }`}
      >
        {isContact ? (
          <>
            <h2 className="text-lg font-bold">Not an active client</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {client.lostReason ?? "No reason recorded — add one in “Why we lost them” below."}
            </p>
            {client.lostAt && (
              <p className="mt-1 text-xs text-muted">Moved to contacts {fmtDate(client.lostAt)}</p>
            )}
            <form action={convertContactToClient} className="mt-3">
              <input type="hidden" name="id" value={client.id} />
              <ConfirmButton
                message={`Move ${client.name} back to active clients?`}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue"
              >
                ← Move back to clients
              </ConfirmButton>
            </form>
          </>
        ) : (
          <details>
            <summary className="cursor-pointer select-none font-semibold text-blue">
              Didn&apos;t win this one? Move to contacts →
            </summary>
            <p className="mt-2 text-sm text-muted">
              Keeps the record, history, projects and emails exactly as they are — they just
              stop counting as an active client. You can move them back anytime.
            </p>
            <form action={convertClientToContact} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={client.id} />
              <textarea
                name="lostReason"
                rows={2}
                placeholder="Why did we lose them? (price, went with someone else, ghosted, bad fit…)"
                className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
              />
              <ConfirmButton
                message={`Move ${client.name} to contacts? Nothing is deleted — you can move them back anytime.`}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-red-500 hover:text-red-600"
              >
                Move to contacts
              </ConfirmButton>
            </form>
          </details>
        )}
      </section>

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
        {isContact && (
          <TextArea
            name="lostReason"
            label="Why we lost them"
            defaultValue={client.lostReason}
            rows={2}
          />
        )}
        <TextArea
          name="notes"
          label="Notes (standing — always shown up top)"
          defaultValue={client.notes}
          rows={3}
        />
        <p className="text-sm text-muted">
          {client.email} · in the book since {fmtDate(client.createdAt)}
          {" · "}
          {client.submissions.length} submission{client.submissions.length === 1 ? "" : "s"}
        </p>
        <button className="rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover">
          Save {isContact ? "contact" : "client"}
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

      {/* Send an email */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Send an email</h2>
        <form action={sendClientEmail} className="space-y-3">
          <input type="hidden" name="clientId" value={client.id} />
          <input
            name="subject"
            required
            placeholder="Subject"
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          <textarea
            name="body"
            required
            rows={6}
            placeholder="Write your quote / message… (blank lines start new paragraphs)"
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="includeDriveFolder" className="h-4 w-4 accent-primary" />
            Create &amp; attach a shared Drive folder link
          </label>
          <ConfirmButton
            message={`Send this email to ${client.email}?`}
            className="rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover"
          >
            Send email to {client.name}
          </ConfirmButton>
        </form>
        <p className="mt-2 text-xs text-muted">
          Sends from contact@kulworks.com (replies come to you), and logs it in the activity below.
        </p>
      </section>

      {/* Notes — a running, dated log (separate from the standing notes field above) */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Notes ({notes.length})</h2>
        <form action={addActivity} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="clientId" value={client.id} />
          <input type="hidden" name="type" value="NOTE" />
          <input
            name="body"
            required
            placeholder={
              isContact ? "Why we lost them, what they said, when to try again…" : "Add a note…"
            }
            className="min-w-[12rem] flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary-hover">
            Add note
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {notes.length === 0 ? (
            <li className="text-sm text-muted">No notes yet.</li>
          ) : (
            notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-surface2 px-3 py-2 text-sm">
                <div className="text-xs text-muted">{fmtDateTime(n.occurredAt)}</div>
                <p className="mt-0.5 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Activity */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Activity &amp; reminders</h2>
        <AddActivity clientId={client.id} />
        <div className="mt-2">
          <SetReminder clientId={client.id} />
        </div>
        <ul className="mt-4 space-y-2">
          {otherActivity.length === 0 ? (
            <li className="text-sm text-muted">No activity yet.</li>
          ) : (
            otherActivity.map((a) => (
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
