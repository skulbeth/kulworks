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
} from "../../_actions";
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

      {/* Send progress update to the customer (manual, only on click) */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">
          Send progress update to {project.client.name}
        </h2>
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
        <ConfirmButton
          message="Delete this project and all its payments & activity? This cannot be undone."
          className="text-sm font-semibold text-red-600 hover:underline"
        >
          Delete this project
        </ConfirmButton>
      </form>
    </div>
  );
}
