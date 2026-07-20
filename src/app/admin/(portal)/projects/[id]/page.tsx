import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtDateTime, fmtMoney, toDateInput } from "@/lib/format";
import {
  updateProject,
  deletePayment,
  deleteProject,
  deleteActivity,
  sendProjectUpdate,
  notifyProjectStarted,
  sendInvoiceDoc,
  markInvoicePaid,
  voidInvoiceDoc,
  convertQuoteToInvoice,
} from "../../_actions";
import InvoiceEditor from "../../_components/InvoiceEditor";
import { computeTotals, docLabel } from "@/lib/invoice";
import { site } from "@/data/site";
import {
  TextField,
  TextArea,
  NumberField,
  DateField,
  SelectField,
  FieldGroup,
} from "../../_components/FormFields";
import AddActivity from "../../_components/AddActivity";
import AddPayment from "../../_components/AddPayment";
import SetReminder from "../../_components/SetReminder";
import ConfirmButton from "../../_components/ConfirmButton";

export const dynamic = "force-dynamic";

const STAGE_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "QUOTED", label: "Quoted" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_PRODUCTION", label: "In production" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CLOSED", label: "Closed" },
  { value: "LOST", label: "Lost" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: true,
      activities: { where: { deletedAt: null }, orderBy: { occurredAt: "desc" } },
      payments: { where: { deletedAt: null }, orderBy: { paidAt: "desc" } },
      invoices: {
        where: { deletedAt: null },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!project) notFound();

  const totalPaid = project.payments.reduce((sum, p) => sum + p.amount, 0);
  const basis = project.finalAmount ?? project.quotedAmount ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/projects/" className="text-sm font-semibold text-blue">
          ← Projects
        </Link>
        <Link
          href={`/admin/clients/${project.clientId}/`}
          className="text-sm font-semibold text-blue"
        >
          Client: {project.client.name} →
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{project.title}</h1>

      <form action={updateProject} className="space-y-4">
        <input type="hidden" name="id" value={project.id} />

        <FieldGroup title="Overview">
          <TextField name="title" label="Title" defaultValue={project.title} />
          <SelectField
            name="stage"
            label="Stage"
            defaultValue={project.stage}
            options={STAGE_OPTIONS}
          />
        </FieldGroup>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea name="requested" label="Requested" defaultValue={project.requested} />
          <TextArea name="deliverables" label="We'll provide" defaultValue={project.deliverables} />
        </div>

        <FieldGroup title="Specs">
          <NumberField name="cardCount" label="Card count" defaultValue={project.cardCount} />
          <TextField name="cardSize" label="Card size" defaultValue={project.cardSize} />
          <NumberField name="quantity" label="Quantity" defaultValue={project.quantity} />
          <TextField name="finish" label="Finish" defaultValue={project.finish} />
          <TextField name="specsNotes" label="Spec notes" defaultValue={project.specsNotes} />
        </FieldGroup>

        <FieldGroup title="Money & time">
          <NumberField name="quotedAmount" label="Quoted ($)" step="0.01" defaultValue={project.quotedAmount} />
          <NumberField name="finalAmount" label="Final ($)" step="0.01" defaultValue={project.finalAmount} />
          <NumberField name="materialCost" label="Material cost ($)" step="0.01" defaultValue={project.materialCost} />
          <NumberField name="devHours" label="Dev hours" step="0.25" defaultValue={project.devHours} />
        </FieldGroup>

        <FieldGroup title="Dates">
          <DateField name="dueDate" label="Due" defaultValue={toDateInput(project.dueDate)} />
          <DateField name="startDate" label="Start" defaultValue={toDateInput(project.startDate)} />
          <DateField name="deliveryDate" label="Delivery" defaultValue={toDateInput(project.deliveryDate)} />
        </FieldGroup>

        <FieldGroup title="Shipping">
          <TextField name="shipStreet" label="Street" defaultValue={project.shipStreet} />
          <TextField name="shipCity" label="City" defaultValue={project.shipCity} />
          <TextField name="shipState" label="State" defaultValue={project.shipState} />
          <TextField name="shipPostalCode" label="ZIP" defaultValue={project.shipPostalCode} />
        </FieldGroup>

        <TextArea name="notes" label="Notes" defaultValue={project.notes} rows={4} />

        <button className="rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover">
          Save project
        </button>
      </form>

      {/* Payments */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Payments</h2>
          <div className="text-sm text-muted">
            Paid <span className="font-bold text-foreground">{fmtMoney(totalPaid)}</span>
            {basis !== null && (
              <>
                {" · "}Balance{" "}
                <span className="font-bold text-foreground">{fmtMoney(basis - totalPaid)}</span>
              </>
            )}
          </div>
        </div>
        <AddPayment projectId={project.id} />
        <ul className="mt-4 space-y-2">
          {project.payments.length === 0 ? (
            <li className="text-sm text-muted">No payments logged.</li>
          ) : (
            project.payments.map((pay) => (
              <li
                key={pay.id}
                className="flex flex-wrap items-center gap-3 rounded-lg bg-surface2 px-3 py-2 text-sm"
              >
                <span className="font-bold">{fmtMoney(pay.amount)}</span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                  {pay.method.replace(/_/g, " ")}
                </span>
                <span className="text-muted">{fmtDate(pay.paidAt)}</span>
                {pay.note && <span className="text-muted">— {pay.note}</span>}
                <form action={deletePayment} className="ml-auto">
                  <input type="hidden" name="id" value={pay.id} />
                  <button className="text-xs text-red-600 hover:underline">Remove</button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Quotes & Invoices */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Quotes &amp; Invoices</h2>

        {project.invoices.length > 0 && (
          <ul className="mb-4 space-y-2">
            {project.invoices.map((inv) => {
              const { total } = computeTotals(inv.items, inv.taxRate);
              const paid = inv.status === "PAID";
              const voided = inv.status === "VOID";
              return (
                <li key={inv.id} className="rounded-lg border border-border bg-surface2 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold">{inv.number}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                      {docLabel(inv.type)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        paid
                          ? "bg-green-500/15 text-green-600"
                          : voided
                          ? "bg-red-500/15 text-red-600"
                          : "bg-blue/10 text-blue"
                      }`}
                    >
                      {inv.status}
                    </span>
                    <span className="tabular-nums">{fmtMoney(total)}</span>
                    <a
                      href={`/invoice/${inv.token}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs font-semibold text-blue hover:underline"
                    >
                      View →
                    </a>
                  </div>

                  {!voided && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
                      <form action={sendInvoiceDoc}>
                        <input type="hidden" name="id" value={inv.id} />
                        <ConfirmButton
                          message={`Email ${docLabel(inv.type).toLowerCase()} ${inv.number} to ${project.client.email}?`}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-blue hover:text-blue"
                        >
                          {inv.status === "DRAFT" ? "Send" : "Resend"}
                        </ConfirmButton>
                      </form>

                      {inv.type === "QUOTE" && (
                        <form action={convertQuoteToInvoice}>
                          <input type="hidden" name="id" value={inv.id} />
                          <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-blue hover:text-blue">
                            Convert to invoice
                          </button>
                        </form>
                      )}

                      {inv.type === "INVOICE" && !paid && (
                        <form action={markInvoicePaid} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={inv.id} />
                          <select
                            name="method"
                            defaultValue="PAYPAL"
                            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                          >
                            <option value="PAYPAL">PayPal</option>
                            <option value="VENMO">Venmo</option>
                            <option value="ZELLE">Zelle</option>
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="CHECK">Check</option>
                            <option value="BANK_TRANSFER">Bank</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <button className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-black hover:bg-primary-hover">
                            Mark paid
                          </button>
                        </form>
                      )}

                      <form action={voidInvoiceDoc} className="ml-auto">
                        <input type="hidden" name="id" value={inv.id} />
                        <ConfirmButton
                          message={`Void ${inv.number}? It's kept on record but cancelled.`}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Void
                        </ConfirmButton>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <details>
          <summary className="cursor-pointer text-sm font-semibold text-blue">
            + New quote or invoice
          </summary>
          <div className="mt-3 border-t border-border pt-3">
            <InvoiceEditor projectId={project.id} defaultServiceCharge={site.payments.defaultServiceCharge} />
          </div>
        </details>
      </section>

      {/* Send progress update to the customer (manual, only on click) */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">
          Send progress update to {project.client.name}
        </h2>

        {/* One-click "we've started your project" note (details auto-filled) */}
        <form action={notifyProjectStarted} className="mb-3">
          <input type="hidden" name="projectId" value={project.id} />
          <ConfirmButton
            message={`Email ${project.client.email} that we've started their project? The details above (title, scope, deliverables, target date) are filled in automatically.`}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue"
          >
            📧 Notify client: project started
          </ConfirmButton>
        </form>
        <p className="mb-3 text-xs text-muted">
          Great right after a call. Or write a custom message below:
        </p>

        <form action={sendProjectUpdate} className="space-y-3">
          <input type="hidden" name="projectId" value={project.id} />
          <textarea
            name="message"
            required
            rows={4}
            placeholder="e.g. Your cards are printed and shipping today!"
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          <ConfirmButton
            message={`Email this update to ${project.client.email}?`}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover"
          >
            Send update
          </ConfirmButton>
        </form>
        <p className="mt-2 text-xs text-muted">
          Only sends when you click — nothing goes out automatically. Logged in Activity below.
        </p>
      </section>

      {/* Activity */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Activity &amp; reminders</h2>
        <AddActivity projectId={project.id} clientId={project.clientId} />
        <div className="mt-2">
          <SetReminder projectId={project.id} clientId={project.clientId} />
        </div>
        <ul className="mt-4 space-y-2">
          {project.activities.length === 0 ? (
            <li className="text-sm text-muted">No activity yet.</li>
          ) : (
            project.activities.map((a) => (
              <li key={a.id} className="rounded-lg bg-surface2 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{a.type.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{fmtDateTime(a.occurredAt)}</span>
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-red-600 hover:underline" title="Delete">
                        ×
                      </button>
                    </form>
                  </div>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap">{a.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <form action={deleteProject} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={project.id} />
        <ConfirmButton
          message="Archive this project (with its payments & activity)? It's hidden from your lists but kept — you can restore it from the Archive tab."
          className="text-sm font-semibold text-red-600 hover:underline"
        >
          Delete this project
        </ConfirmButton>
      </form>
    </div>
  );
}
