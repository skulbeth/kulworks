"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireProfile, currentSessionId, trustedFactorIds, setTrustedFactorIds } from "@/lib/auth";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";
import { logError } from "@/lib/log-error";
import { resend, FROM, sendMail, mailSent, addSubscriberToAudience } from "@/lib/email";
import { uploadsEnabled, setUploadsEnabled, removeUploadFiles } from "@/lib/uploads";
import { createClientFolder, driveConfigured } from "@/lib/google-drive";
import { deliveryLabel, cardBacksLabel } from "@/lib/order-details";
import { fetchClientMessages } from "@/lib/gmail";
import { syncProjectEvents, syncReminderEvent, deleteEvent } from "@/lib/google-calendar";
import { createAdminClient } from "@/lib/supabase/admin";
import { TWOFA_COOKIE, COOKIE_TTL_MS, signSession } from "@/lib/two-factor";
import {
  computeTotals,
  docLabel,
  splitDeposit,
  defaultValidUntil,
  fmtValidDate,
  quoteExpired,
  BALANCE_PREFIX,
  keepBalanceMarker,
} from "@/lib/invoice";
import { site } from "@/data/site";

const SITE_URL = "https://kulworks.com";

// Writes an audit-log entry. Best-effort — never blocks the action on failure.
async function logAudit(actorEmail: string, action: string, detail?: string) {
  try {
    await prisma.auditLog.create({ data: { actorEmail, action, detail: detail ?? null } });
  } catch {
    /* ignore */
  }
}

// ── form-value parsers ──
function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function num(fd: FormData, k: string): number | null {
  const v = s(fd, k);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function int(fd: FormData, k: string): number | null {
  const n = num(fd, k);
  return n === null ? null : Math.trunc(n);
}
// Counts, money and hours on a project can't be negative; a stray minus is ignored
// (undefined = leave what's stored), not saved and not used to blank the field.
function nn(n: number | null): number | null | undefined {
  return n !== null && n < 0 ? undefined : n;
}
function date(fd: FormData, k: string): Date | null {
  const v = s(fd, k);
  // Noon UTC, like the quote form: the same calendar day in UTC (server, Google Calendar)
  // and in Texas, so a date never slips a day depending on who reads it.
  return v ? new Date(`${v}T12:00:00Z`) : null;
}

const PROJECT_STAGES = [
  "LEAD", "QUOTED", "APPROVED", "IN_PRODUCTION", "DELIVERED", "CLOSED", "LOST", "REJECTED",
];
const SUBMISSION_STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "REJECTED"];
const ACTIVITY_TYPES = [
  "NOTE", "EMAIL_SENT", "EMAIL_RECEIVED", "CALL", "MEETING", "STATUS_CHANGE", "PAYMENT", "REMINDER",
];
const PAYMENT_METHODS = [
  "CASH", "CARD", "PAYPAL", "VENMO", "ZELLE", "CHECK", "BANK_TRANSFER", "OTHER",
];

// Auto-reminders: created a few days before a project's due date.
const AUTO_TAG = "[auto]";
const REMINDER_LEAD_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

async function syncAutoReminder(projectId: string, title: string, dueDate: Date | null) {
  // Update the project's auto-reminder IN PLACE (never delete + recreate), so a reminder
  // Sam marked Done stays done across saves/restores. It only reopens when the due date
  // actually moves. Duplicates (from older code) are archived; one row is kept.
  const autos = await prisma.activity.findMany({
    where: { projectId, type: "REMINDER", body: { startsWith: AUTO_TAG } },
    select: { id: true, body: true, remindAt: true, done: true, deletedAt: true, calendarEventId: true },
    orderBy: { createdAt: "desc" },
  });
  // Prefer a live row over an archived one; newest first otherwise.
  autos.sort((a, b) => Number(!!a.deletedAt) - Number(!!b.deletedAt));
  const [keep, ...extras] = dueDate ? autos : [];
  const now = new Date();

  // No due date (or duplicate rows): take them off the calendar and archive them.
  // remindAt is cleared so a due date added later always counts as a change and reopens
  // it. The event id is only dropped once Google confirms the delete.
  for (const a of dueDate ? extras : autos) {
    const deleted = await deleteEvent(a.calendarEventId);
    await prisma.activity.update({
      where: { id: a.id },
      data: {
        deletedAt: a.deletedAt ?? now,
        remindAt: null,
        ...(deleted ? { calendarEventId: null } : {}),
      },
    });
  }
  if (!dueDate) return;

  const body = `${AUTO_TAG} "${title}" is due ${dueDate.toLocaleDateString("en-US")}`;
  const remindAt = new Date(dueDate.getTime() - REMINDER_LEAD_DAYS * DAY_MS);

  if (!keep) {
    const activity = await prisma.activity.create({
      data: { type: "REMINDER", body, remindAt, projectId },
    });
    const calendarEventId = await syncReminderEvent({
      activityId: activity.id,
      body,
      remindAt,
      done: false,
      calendarEventId: null,
    });
    if (calendarEventId) {
      await prisma.activity.update({ where: { id: activity.id }, data: { calendarEventId } });
    }
    return;
  }

  // Compare days, not instants: older rows hold midnight, newer ones noon.
  const dateChanged = keep.remindAt?.toISOString().slice(0, 10) !== remindAt.toISOString().slice(0, 10);
  const closed = keep.done || !!keep.deletedAt;
  // Done/archived and the date hasn't moved -> stays closed (the title may still update).
  const reopen = closed && dateChanged;
  const open = !closed || reopen;
  if (keep.body !== body || dateChanged) {
    await prisma.activity.update({
      where: { id: keep.id },
      data: { body, remindAt, ...(reopen ? { done: false, deletedAt: null } : {}) },
    });
  }
  // Only touch the calendar when something it shows changed (or a closed reminder still
  // has an event that an earlier delete failed to remove).
  const needsCalendar = open
    ? keep.body !== body || dateChanged || !keep.calendarEventId
    : !!keep.calendarEventId;
  if (!needsCalendar) return;
  const calendarEventId = await syncReminderEvent({
    activityId: keep.id,
    body,
    remindAt,
    done: !open,
    calendarEventId: keep.calendarEventId,
  });
  if (calendarEventId !== keep.calendarEventId) {
    await prisma.activity.update({ where: { id: keep.id }, data: { calendarEventId } });
  }
}

// Re-push one reminder to the calendar (after a restore) and persist the event id.
async function resyncReminder(r: {
  id: string;
  body: string;
  remindAt: Date | null;
  done: boolean;
  calendarEventId: string | null;
}) {
  const calendarEventId = await syncReminderEvent({
    activityId: r.id,
    body: r.body,
    remindAt: r.remindAt,
    done: r.done,
    calendarEventId: r.calendarEventId,
  });
  if (calendarEventId !== r.calendarEventId) {
    await prisma.activity.update({ where: { id: r.id }, data: { calendarEventId } });
  }
}

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
}

// ── Submissions ──
export async function updateSubmissionStatus(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  const status = s(formData, "status");
  if (!id || !status || !SUBMISSION_STATUSES.includes(status)) return;
  await prisma.submission.update({ where: { id }, data: { status: status as never } });
  revalidateAdmin();
}

// Creates a Project from a submission (reusing its client), links them, opens it.
export async function convertSubmissionToProject(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const sub = await prisma.submission.findUnique({ where: { id }, include: { client: true } });
  if (!sub) return;

  // Ensure a client exists for this submission.
  let clientId = sub.clientId;
  if (!clientId) {
    const client = await prisma.client.upsert({
      where: { email: sub.email.toLowerCase() },
      create: { name: sub.name, email: sub.email.toLowerCase() },
      update: {},
    });
    clientId = client.id;
  }

  const project = await prisma.project.create({
    data: {
      title: `${sub.name}: ${sub.projectType ?? "project"}`,
      stage: "LEAD",
      clientId,
      requested: sub.message,
      // Carry over what the form asked up front, so nobody re-types it.
      dueDate: sub.dueDate,
      shipStreet: sub.shipStreet,
      shipCity: sub.shipCity,
      shipState: sub.shipState,
      shipPostalCode: sub.shipPostalCode,
      shipCountry: sub.shipCountry,
      notes:
        [
          sub.deliveryMethod ? `Delivery: ${deliveryLabel(sub.deliveryMethod)}` : null,
          sub.cardBacks ? `Card backs: ${cardBacksLabel(sub.cardBacks)}` : null,
        ]
          .filter(Boolean)
          .join("\n") || null,
    },
  });

  // A due date that came in on the form goes on the calendar now, same as an edit would.
  if (project.dueDate) {
    const { dueEventId, deliveryEventId } = await syncProjectEvents({
      projectId: project.id,
      title: project.title,
      dueDate: project.dueDate,
      deliveryDate: null,
      dueEventId: null,
      deliveryEventId: null,
    });
    await prisma.project.update({ where: { id: project.id }, data: { dueEventId, deliveryEventId } });
    await syncAutoReminder(project.id, project.title, project.dueDate);
  }

  await prisma.submission.update({
    where: { id },
    data: { projectId: project.id, status: "CONTACTED", clientId },
  });
  await prisma.activity.create({
    data: {
      type: "STATUS_CHANGE",
      body: "Created from website submission.",
      projectId: project.id,
      clientId,
      authorId: profile.id,
    },
  });

  revalidateAdmin();
  redirect(`/admin/projects/${project.id}/`);
}

// ── Projects ──
export async function updateProject(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const stage = s(formData, "stage");
  const dueDate = date(formData, "dueDate");
  const title = s(formData, "title") ?? "Untitled project";
  const deliveryDate = date(formData, "deliveryDate");
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { stage: true, dueEventId: true, deliveryEventId: true },
  });

  await prisma.project.update({
    where: { id },
    data: {
      title,
      stage: stage && PROJECT_STAGES.includes(stage) ? (stage as never) : undefined,
      requested: s(formData, "requested"),
      deliverables: s(formData, "deliverables"),
      cardCount: nn(int(formData, "cardCount")),
      cardSize: s(formData, "cardSize"),
      quantity: nn(int(formData, "quantity")),
      finish: s(formData, "finish"),
      specsNotes: s(formData, "specsNotes"),
      quotedAmount: nn(num(formData, "quotedAmount")),
      finalAmount: nn(num(formData, "finalAmount")),
      materialCost: nn(num(formData, "materialCost")),
      devHours: nn(num(formData, "devHours")),
      dueDate,
      startDate: date(formData, "startDate"),
      deliveryDate,
      shipStreet: s(formData, "shipStreet"),
      shipCity: s(formData, "shipCity"),
      shipState: s(formData, "shipState"),
      shipPostalCode: s(formData, "shipPostalCode"),
      shipCountry: s(formData, "shipCountry"),
      notes: s(formData, "notes"),
    },
  });

  // Log a timestamped stage change to the project's history.
  if (stage && existing && stage !== existing.stage && PROJECT_STAGES.includes(stage)) {
    await prisma.activity.create({
      data: {
        type: "STATUS_CHANGE",
        body: `Stage → ${stage.replace(/_/g, " ")}`,
        projectId: id,
        authorId: profile.id,
      },
    });
  }

  // Push the due + delivery dates to the Kulworks calendar (best-effort), persisting the
  // event ids so later edits update the same events.
  const { dueEventId, deliveryEventId } = await syncProjectEvents({
    projectId: id,
    title,
    dueDate,
    deliveryDate,
    dueEventId: existing?.dueEventId ?? null,
    deliveryEventId: existing?.deliveryEventId ?? null,
  });
  await prisma.project.update({ where: { id }, data: { dueEventId, deliveryEventId } });

  // Keep the due-date auto-reminder (and its calendar event) in sync.
  await syncAutoReminder(id, title, dueDate);

  await logAudit(profile.email, "update.project", title);
  revalidateAdmin();
  redirect(`/admin/projects/${id}/`);
}

export async function createProjectForClient(formData: FormData) {
  await requireProfile();
  const clientId = s(formData, "clientId");
  if (!clientId) return;
  const project = await prisma.project.create({
    data: { title: s(formData, "title") ?? "New project", clientId, stage: "LEAD" },
  });
  revalidateAdmin();
  redirect(`/admin/projects/${project.id}/`);
}

// ── Manual "add" from the admin list pages ──
export async function createClientManual(formData: FormData) {
  const { profile } = await requireProfile();
  const name = s(formData, "name");
  const email = s(formData, "email")?.toLowerCase();
  if (!name || !email) redirect("/admin/clients/?error=missing");
  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing) redirect(`/admin/clients/${existing.id}/`);
  const asContact = s(formData, "kind") === "CONTACT";
  const client = await prisma.client.create({
    data: {
      name,
      email,
      phone: s(formData, "phone"),
      company: s(formData, "company"),
      notes: s(formData, "notes"),
      kind: asContact ? "CONTACT" : "CLIENT",
      lostAt: asContact ? new Date() : null,
      lostReason: asContact ? s(formData, "lostReason") : null,
    },
  });
  await logAudit(profile.email, asContact ? "create.contact" : "create.client", email);
  revalidateAdmin();
  redirect(`/admin/clients/${client.id}/`);
}

export async function createSubmissionManual(formData: FormData) {
  const { profile } = await requireProfile();
  const name = s(formData, "name");
  const email = s(formData, "email")?.toLowerCase();
  const phone = s(formData, "phone");
  const projectType = s(formData, "projectType");
  const message = s(formData, "message");
  if (!name || !email || !message) redirect("/admin/submissions/?error=missing");
  const client = await prisma.client.upsert({
    where: { email },
    create: { name, email, phone },
    update: phone ? { phone } : {},
  });
  const submission = await prisma.submission.create({
    data: { name, email, phone, projectType: projectType || null, message, clientId: client.id, status: "NEW" },
  });
  await logAudit(profile.email, "create.submission", email);
  revalidateAdmin();
  redirect(`/admin/submissions/?open=${submission.id}`);
}

export async function createProject(formData: FormData) {
  const { profile } = await requireProfile();
  const title = s(formData, "title");
  const clientName = s(formData, "clientName");
  const clientEmail = s(formData, "clientEmail")?.toLowerCase();
  if (!title || !clientName || !clientEmail) redirect("/admin/projects/?error=missing");
  const client = await prisma.client.upsert({
    where: { email: clientEmail },
    create: { name: clientName, email: clientEmail },
    update: {},
  });
  const project = await prisma.project.create({
    data: { title, clientId: client.id, stage: "LEAD" },
  });
  await logAudit(profile.email, "create.project", title);
  revalidateAdmin();
  redirect(`/admin/projects/${project.id}/`);
}

export async function addSubscriberManual(formData: FormData) {
  const { profile } = await requireProfile();
  const email = s(formData, "email")?.toLowerCase();
  if (!email) redirect("/admin/subscribers/?error=missing");
  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) redirect("/admin/subscribers/?exists=1");
  let resendId: string | null = null;
  try {
    resendId = await addSubscriberToAudience(email);
  } catch {
    /* best effort — still save locally */
  }
  await prisma.subscriber.create({
    data: { email, source: "admin", resendContactId: resendId },
  });
  await logAudit(profile.email, "create.subscriber", email);
  revalidateAdmin();
  redirect("/admin/subscribers/?added=1");
}

// ── Clients ──
export async function updateClient(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  // Write only the fields Sam changed. The client can save their own address and phone
  // from their quote page while this form sits open; resaving the page's old values
  // would quietly put the old (or blank) address back.
  let orig: Record<string, string | null> = {};
  try {
    orig = JSON.parse(s(formData, "orig") ?? "{}");
  } catch {}
  const data: Record<string, string | null> = {};
  for (const k of ["name", "phone", "company", "street", "city", "state", "postalCode", "country", "notes", "lostReason"]) {
    // Only contacts render lostReason; a field that isn't on the form is left alone.
    if (!formData.has(k)) continue;
    const v = s(formData, k);
    if (k in orig && (orig[k] ?? null) === v) continue;
    data[k] = k === "name" ? (v ?? "Unnamed") : v;
  }
  if (Object.keys(data).length) await prisma.client.update({ where: { id }, data });
  await logAudit(profile.email, "update.client", id);
  revalidateAdmin();
  redirect(`/admin/clients/${id}/`);
}

// Pull the Gmail back-and-forth with this client onto their timeline.
//
// Deduped on the Gmail message id, so running it twice is harmless: a message
// that is already filed is skipped rather than added again. Only ever reads, and
// only ever asks for messages involving this one address.
export async function syncClientEmails(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  if (!client) return;

  const { messages, error } = await fetchClientMessages(client.email, 25);
  if (error) {
    await logAudit(profile.email, "gmail.sync.error", `${client.email}: ${error}`);
    revalidateAdmin();
    redirect(`/admin/clients/${id}/?error=gmail&detail=${encodeURIComponent(error.slice(0, 180))}`);
  }

  const existing = new Set(
    (
      await prisma.activity.findMany({
        where: { externalId: { in: messages.map((m) => m.id) } },
        select: { externalId: true },
      })
    ).map((a) => a.externalId)
  );

  const fresh = messages.filter((m) => !existing.has(m.id));
  if (fresh.length) {
    await prisma.activity.createMany({
      data: fresh.map((m) => ({
        type: (m.outbound ? "EMAIL_SENT" : "EMAIL_RECEIVED") as never,
        body: `${m.subject}
${m.snippet}`,
        occurredAt: m.date,
        clientId: client.id,
        authorId: profile.id,
        externalId: m.id,
      })),
      skipDuplicates: true,
    });
  }

  await logAudit(profile.email, "gmail.sync", `${client.email}: ${fresh.length} new of ${messages.length}`);
  revalidateAdmin();
  redirect(`/admin/clients/${id}/?done=gmail&n=${fresh.length}&seen=${messages.length}`);
}

// ── Client ⇄ contact ──
// A lead we didn't win stays in the book as a CONTACT: same record, same history,
// plus the reason we lost them. Never deleted — one click puts them back.
export async function convertClientToContact(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const reason = s(formData, "lostReason");
  const client = await prisma.client.update({
    where: { id },
    data: { kind: "CONTACT", lostAt: new Date(), lostReason: reason },
  });
  await prisma.activity.create({
    data: {
      type: "STATUS_CHANGE",
      body: reason ? `Moved to contacts: ${reason}` : "Moved to contacts (not an active client).",
      clientId: id,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "client.to_contact", client.email);
  revalidateAdmin();
  redirect(`/admin/clients/${id}/`);
}

export async function convertContactToClient(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  // `lostReason` is kept on the record as history — it just stops being shown.
  const client = await prisma.client.update({
    where: { id },
    data: { kind: "CLIENT", lostAt: null },
  });
  await prisma.activity.create({
    data: {
      type: "STATUS_CHANGE",
      body: "Moved back to clients.",
      clientId: id,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "contact.to_client", client.email);
  revalidateAdmin();
  redirect(`/admin/clients/${id}/`);
}

// ── Activity ──
export async function addActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const body = s(formData, "body");
  const type = s(formData, "type") ?? "NOTE";
  if (!body) return;
  await prisma.activity.create({
    data: {
      type: ACTIVITY_TYPES.includes(type) ? (type as never) : "NOTE",
      body,
      projectId: s(formData, "projectId"),
      clientId: s(formData, "clientId"),
      authorId: profile.id,
    },
  });
  revalidateAdmin();
}

// ── Payments ──
export async function addPayment(formData: FormData) {
  await requireProfile();
  const projectId = s(formData, "projectId");
  const amount = num(formData, "amount");
  // A payment is money in; zero or negative is a typo, not a payment.
  if (!projectId || amount === null || amount <= 0) return;
  const method = s(formData, "method") ?? "OTHER";
  const paidAt = date(formData, "paidAt");
  await prisma.payment.create({
    data: {
      projectId,
      amount,
      method: (PAYMENT_METHODS.includes(method) ? method : "OTHER") as never,
      note: s(formData, "note"),
      paidAt: paidAt ?? undefined,
    },
  });
  revalidateAdmin();
}

export async function deletePayment(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidateAdmin();
}

// ── Reminders (stored as Activity of type REMINDER with a remindAt date) ──
export async function addReminder(formData: FormData) {
  const { profile } = await requireProfile();
  const remindAt = date(formData, "remindAt");
  const body = s(formData, "body");
  if (!remindAt || !body) return;
  const activity = await prisma.activity.create({
    data: {
      type: "REMINDER",
      body,
      remindAt,
      projectId: s(formData, "projectId"),
      clientId: s(formData, "clientId"),
      authorId: profile.id,
    },
  });
  const calendarEventId = await syncReminderEvent({
    activityId: activity.id,
    body,
    remindAt,
    done: false,
    calendarEventId: null,
  });
  if (calendarEventId) {
    await prisma.activity.update({ where: { id: activity.id }, data: { calendarEventId } });
  }
  revalidateAdmin();
}

export async function completeReminder(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  // Done reminders come off the calendar.
  const existing = await prisma.activity.findUnique({
    where: { id },
    select: { calendarEventId: true },
  });
  // Keep the event id if Google didn't confirm the delete, so a later sync can retry.
  const deleted = await deleteEvent(existing?.calendarEventId);
  await prisma.activity.update({
    where: { id },
    data: { done: true, ...(deleted ? { calendarEventId: null } : {}) },
  });
  revalidateAdmin();
}

// ── Soft deletes (archive — data is never hard-deleted, just hidden from views) ──
export async function deleteSubmission(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.submission.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(profile.email, "archive.submission", id);
  revalidateAdmin();
}

export async function deleteActivity(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const existing = await prisma.activity.findUnique({
    where: { id },
    select: { calendarEventId: true },
  });
  const deleted = await deleteEvent(existing?.calendarEventId);
  await prisma.activity.update({
    where: { id },
    data: { deletedAt: new Date(), ...(deleted ? { calendarEventId: null } : {}) },
  });
  revalidateAdmin();
}

export async function deleteProject(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const now = new Date();
  // Remove this project's calendar events (project dates + any reminders) before archiving.
  const proj = await prisma.project.findUnique({
    where: { id },
    select: { dueEventId: true, deliveryEventId: true },
  });
  const reminders = await prisma.activity.findMany({
    where: { projectId: id, calendarEventId: { not: null } },
    select: { id: true, calendarEventId: true },
  });
  // Only ids Google confirmed gone are cleared; the rest are kept for a later retry.
  const [dueGone, deliveryGone, ...remindersGone] = await Promise.all([
    deleteEvent(proj?.dueEventId),
    deleteEvent(proj?.deliveryEventId),
    ...reminders.map((r) => deleteEvent(r.calendarEventId)),
  ]);
  const clearedReminderIds = reminders.filter((_, i) => remindersGone[i]).map((r) => r.id);
  // Archive the project + its payments & activities; unlink submissions so they can
  // be re-converted. Nothing is hard-deleted.
  // Rows already deleted keep their own time, so a restore (which matches on the
  // project's archive time) doesn't bring them back.
  await prisma.payment.updateMany({ where: { projectId: id, deletedAt: null }, data: { deletedAt: now } });
  await prisma.activity.updateMany({ where: { projectId: id, deletedAt: null }, data: { deletedAt: now } });
  if (clearedReminderIds.length) {
    await prisma.activity.updateMany({
      where: { id: { in: clearedReminderIds } },
      data: { calendarEventId: null },
    });
  }
  await prisma.submission.updateMany({ where: { projectId: id }, data: { projectId: null } });
  await prisma.project.update({
    where: { id },
    data: {
      deletedAt: now,
      ...(dueGone ? { dueEventId: null } : {}),
      ...(deliveryGone ? { deliveryEventId: null } : {}),
    },
  });
  await logAudit(profile.email, "archive.project", id);
  revalidateAdmin();
  redirect("/admin/projects/");
}

// ── Restore (un-archive) ──
export async function restoreSubmission(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.submission.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(profile.email, "restore.submission", id);
  revalidateAdmin();
}

export async function restoreProject(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const archived = await prisma.project.findUnique({ where: { id }, select: { deletedAt: true } });
  if (!archived?.deletedAt) redirect("/admin/archive/");
  const at = archived.deletedAt;
  await prisma.project.update({ where: { id }, data: { deletedAt: null } });
  // Only what the archive itself hid; a payment or note deleted before that stays deleted.
  await prisma.payment.updateMany({ where: { projectId: id, deletedAt: at }, data: { deletedAt: null } });
  await prisma.activity.updateMany({ where: { projectId: id, deletedAt: at }, data: { deletedAt: null } });

  // Re-push the project's calendar events (removed on archive), then rebuild the auto-reminder.
  const proj = await prisma.project.findUnique({
    where: { id },
    select: { title: true, dueDate: true, deliveryDate: true, dueEventId: true, deliveryEventId: true },
  });
  if (proj) {
    // Pass any ids the archive couldn't delete, so they're updated rather than duplicated.
    const { dueEventId, deliveryEventId } = await syncProjectEvents({
      projectId: id,
      title: proj.title,
      dueDate: proj.dueDate,
      deliveryDate: proj.deliveryDate,
      dueEventId: proj.dueEventId,
      deliveryEventId: proj.deliveryEventId,
    });
    await prisma.project.update({ where: { id }, data: { dueEventId, deliveryEventId } });
    await syncAutoReminder(id, proj.title, proj.dueDate);
    // Manual reminders came off the calendar on archive; put the open ones back.
    const reminders = await prisma.activity.findMany({
      where: { projectId: id, type: "REMINDER", deletedAt: null, body: { not: { startsWith: AUTO_TAG } } },
      select: { id: true, body: true, remindAt: true, done: true, calendarEventId: true },
    });
    for (const r of reminders) await resyncReminder(r);
  }

  await logAudit(profile.email, "restore.project", id);
  revalidateAdmin();
}

export async function restoreActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const r = await prisma.activity.update({
    where: { id },
    data: { deletedAt: null },
    select: { id: true, type: true, body: true, remindAt: true, done: true, calendarEventId: true },
  });
  if (r.type === "REMINDER") await resyncReminder(r);
  await logAudit(profile.email, "restore.activity", id);
  revalidateAdmin();
}

export async function restorePayment(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.payment.update({ where: { id }, data: { deletedAt: null } });
  await logAudit(profile.email, "restore.payment", id);
  revalidateAdmin();
}

// ── Team members (OWNER only) ──
// Add a team member. One form: enter a password to create their login
// immediately, or leave it blank to email them an invite to set their own password.
/** Map a Supabase auth-admin error message to a team-page error code. */
function classifyAuthError(msg?: string): "emailtaken" | "serverkey" | "create" {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("already") || m.includes("registered")) return "emailtaken";
  if (m.includes("api key") || m.includes("invalid") || m.includes("unauthorized") || m.includes("jwt"))
    return "serverkey";
  return "create";
}

export async function addTeamMember(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "OWNER") redirect("/admin/team/?error=perm");
  const email = s(formData, "email")?.toLowerCase();
  const name = s(formData, "name");
  const phone = s(formData, "phone");
  const password = s(formData, "password");
  const role = s(formData, "role") === "OWNER" ? "OWNER" : "STAFF";
  if (!email) redirect("/admin/team/?error=missing");

  const admin = createAdminClient();

  // Password given → create the login now (active immediately).
  if (password) {
    if (password.length < 8) redirect("/admin/team/?error=weak");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (error || !data?.user) {
      await logAudit(profile.email, "team.create.failed", `${email}: ${error?.message ?? "unknown"}`);
      redirect(`/admin/team/?error=${classifyAuthError(error?.message)}`);
    }
    await prisma.profile.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, email, name: name ?? null, phone, role: role as never },
      update: { email, name: name ?? undefined, phone, role: role as never },
    });
    await logAudit(profile.email, "team.create", `${email} (${role})`);
    revalidateAdmin();
    redirect("/admin/team/?done=created");
  }

  // No password → email an invite; they set their own password.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/admin/reset/`,
  });
  if (error || !data?.user) {
    await logAudit(profile.email, "team.invite.failed", `${email}: ${error?.message ?? "unknown"}`);
    const code = classifyAuthError(error?.message);
    redirect(`/admin/team/?error=${code === "create" ? "invite" : code}`);
  }
  await prisma.profile.upsert({
    where: { id: data.user.id },
    create: { id: data.user.id, email, name: name ?? null, phone, role: role as never },
    update: { name: name ?? undefined, phone, role: role as never },
  });
  await logAudit(profile.email, "team.invite", `${email} (${role})`);
  revalidateAdmin();
  redirect("/admin/team/?invited=1");
}

// Edit an existing admin's email and/or role.
export async function updateAdmin(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "OWNER") redirect("/admin/team/?error=perm");
  const id = s(formData, "id");
  if (!id) return;
  const email = s(formData, "email")?.toLowerCase();
  const phone = s(formData, "phone");
  const role = s(formData, "role") === "OWNER" ? "OWNER" : "STAFF";

  const target = await prisma.profile.findUnique({ where: { id } });
  if (!target) redirect("/admin/team/?error=notfound");

  // Never let the last remaining owner be demoted to staff.
  if (target!.role === "OWNER" && role !== "OWNER") {
    // Active owners only: a deactivated owner can't manage the team.
    const owners = await prisma.profile.count({ where: { role: "OWNER", deactivatedAt: null } });
    if (owners <= 1) redirect("/admin/team/?error=lastowner");
  }

  const admin = createAdminClient();
  if (email && email !== target!.email) {
    const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
    if (error) {
      await logAudit(profile.email, "team.update.failed", `${id}: ${error.message}`);
      redirect("/admin/team/?error=update");
    }
  }
  await prisma.profile.update({
    where: { id },
    data: { email: email ?? target!.email, phone, role: role as never },
  });
  await logAudit(profile.email, "team.update", `${email ?? target!.email} (${role})`);
  revalidateAdmin();
  redirect("/admin/team/?done=updated");
}

// Set a new password for another admin.
export async function resetAdminPassword(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "OWNER") redirect("/admin/team/?error=perm");
  const id = s(formData, "id");
  const password = s(formData, "password");
  if (!id || !password) redirect("/admin/team/?error=missing");
  if (password.length < 8) redirect("/admin/team/?error=weak");

  const target = await prisma.profile.findUnique({ where: { id } });
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    await logAudit(profile.email, "team.reset-password.failed", `${id}: ${error.message}`);
    redirect("/admin/team/?error=update");
  }
  await logAudit(profile.email, "team.reset-password", target?.email ?? id);
  revalidateAdmin();
  redirect("/admin/team/?done=reset");
}

// Deactivate an admin (SOFT): revoke login access + flag the Profile, but keep the
// record so it can be reactivated. Can't deactivate yourself or the last active owner.
export async function deactivateAdmin(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "OWNER") redirect("/admin/team/?error=perm");
  const id = s(formData, "id");
  if (!id) return;
  if (id === profile.id) redirect("/admin/team/?error=self");

  const target = await prisma.profile.findUnique({ where: { id } });
  if (!target) redirect("/admin/team/?error=notfound");
  if (target!.role === "OWNER") {
    const activeOwners = await prisma.profile.count({
      where: { role: "OWNER", deactivatedAt: null },
    });
    if (activeOwners <= 1) redirect("/admin/team/?error=lastowner");
  }

  const admin = createAdminClient();
  // Ban the Supabase login (long duration) so they can't sign in. Reversible.
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  if (error) {
    await logAudit(profile.email, "team.deactivate.failed", `${target!.email}: ${error.message}`);
    redirect("/admin/team/?error=update");
  }
  await prisma.profile.update({ where: { id }, data: { deactivatedAt: new Date() } });
  // Their phone must stop showing client alerts too.
  await prisma.pushDevice.deleteMany({ where: { profileId: id } });
  await logAudit(profile.email, "team.deactivate", target!.email);
  revalidateAdmin();
  redirect("/admin/team/?done=deactivated");
}

// Reactivate a previously deactivated admin.
export async function reactivateAdmin(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "OWNER") redirect("/admin/team/?error=perm");
  const id = s(formData, "id");
  if (!id) return;

  const target = await prisma.profile.findUnique({ where: { id } });
  if (!target) redirect("/admin/team/?error=notfound");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  if (error) {
    await logAudit(profile.email, "team.reactivate.failed", `${target!.email}: ${error.message}`);
    redirect("/admin/team/?error=update");
  }
  await prisma.profile.update({ where: { id }, data: { deactivatedAt: null } });
  await logAudit(profile.email, "team.reactivate", target!.email);
  revalidateAdmin();
  redirect("/admin/team/?done=reactivated");
}

// Any logged-in admin can change their own password.
export async function changeOwnPassword(formData: FormData) {
  const { profile } = await requireProfile();
  const password = s(formData, "password");
  if (!password) redirect("/admin/team/?error=missing");
  if (password.length < 8) redirect("/admin/team/?error=weak");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (error) redirect("/admin/team/?error=update");
  await logAudit(profile.email, "team.self-password", profile.email);
  revalidateAdmin();
  redirect("/admin/team/?done=mypassword");
}

// Any admin turns their own 2FA on/off. Turning it on marks the CURRENT session as verified
// (so you aren't immediately bounced); the code requirement then applies at your next login.
// After an authenticator app is verified from the portal: put it on this admin's trusted
// list (only apps on it can stand in for the emailed code at sign-in). Reaching here
// already took a full sign-in, 2FA included, so a password alone can't add one.
export async function trustTotpFactor(factorId: string) {
  const { user } = await requireProfile();
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = (data?.totp ?? []).filter((x) => x.status === "verified");
  if (!verified.some((x) => x.id === factorId)) return { ok: false as const };
  // Only apps that still exist, plus this one.
  const live = new Set(verified.map((x) => x.id));
  const keep = (await trustedFactorIds(user.id)).filter((id) => live.has(id));
  await setTrustedFactorIds(user.id, [...keep, factorId]);
  return { ok: true as const };
}

export async function setTwoFactorEnabled(formData: FormData) {
  const { user, profile } = await requireProfile();
  const enable = formData.get("enable") === "true";
  await prisma.profile.update({ where: { id: profile.id }, data: { twoFactorEnabled: enable } });

  const jar = await cookies();
  const sid = await currentSessionId();
  if (enable && sid) {
    jar.set(TWOFA_COOKIE, signSession(user.id, sid, Date.now() + COOKIE_TTL_MS), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(COOKIE_TTL_MS / 1000),
    });
  } else if (!enable) {
    jar.delete(TWOFA_COOKIE);
  }
  await logAudit(profile.email, enable ? "team.2fa.enable" : "team.2fa.disable", profile.email);
  revalidateAdmin();
  redirect(`/admin/team/?done=${enable ? "2faon" : "2faoff"}`);
}

// ── Manual email to a client (optionally with a fresh Drive folder link) ──
export async function sendClientEmail(formData: FormData) {
  const { profile } = await requireProfile();
  const clientId = s(formData, "clientId");
  const subject = s(formData, "subject");
  let body = s(formData, "body");
  if (!clientId || !subject || !body) return;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;

  let folderNote = "";
  const attachFolderUrl = s(formData, "attachFolderUrl");
  if (attachFolderUrl) {
    // Reuse an existing folder (e.g. the one already created for this submission) — no duplicate.
    body += `\n\nShared folder to exchange files: ${attachFolderUrl}`;
    folderNote = " (Drive folder link included)";
  } else if (formData.get("includeDriveFolder") === "on" && driveConfigured()) {
    const url = await createClientFolder(
      `C - ${client.name} - ${new Date().toISOString().slice(0, 10)}`
    );
    if (url) {
      body += `\n\nShared folder to exchange files: ${url}`;
      folderNote = " (Drive folder attached)";
    }
  }

  const sent = await sendMail({ to: client.email, replyTo: site.email, subject, text: body });
  // A failed send must not be logged as sent.
  if (!mailSent(sent)) redirect(`/admin/clients/${clientId}/?error=email`);

  // Timestamped record of what was sent.
  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: `Sent "${subject}"${folderNote}\n\n${body}`,
      clientId,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "email.client", client.email);
  revalidateAdmin();
  redirect(`/admin/clients/${clientId}/`);
}

// Create a shared Drive folder for a submission on demand (Sam presses the button, rather
// than one being auto-created for every request). Stores the link on the submission.
export async function createSubmissionDriveFolder(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return;
  if (!submission.driveFolderUrl && driveConfigured()) {
    const url = await createClientFolder(
      `C - ${submission.name} - ${new Date().toISOString().slice(0, 10)}`
    );
    if (url) {
      await prisma.submission.update({
        where: { id },
        data: { driveFolderUrl: url, driveFolder: true },
      });
      await logAudit(profile.email, "submission.drivefolder", submission.email);
    }
  }
  revalidateAdmin();
  redirect(`/admin/submissions/?open=${id}`);
}

// Manually set/replace the storage link on a submission (a folder Sam made himself, or a
// link the client sent — Drive, Dropbox, WeTransfer, etc.). Empty clears it.
export async function setSubmissionFolderLink(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  const url = (s(formData, "url") ?? "").trim();
  if (!id) return;
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) return;
  await prisma.submission.update({
    where: { id },
    data: { driveFolderUrl: url || null, ...(url ? { driveFolder: true } : {}) },
  });
  await logAudit(profile.email, "submission.folderlink", url || "(cleared)");
  revalidateAdmin();
  redirect(`/admin/submissions/?open=${id}`);
}

// ── Trade-show photo uploads (public /upload page) ──
export async function toggleUploads() {
  const { profile } = await requireProfile();
  const now = await uploadsEnabled();
  await setUploadsEnabled(!now);
  await logAudit(profile.email, "uploads.toggle", !now ? "on" : "off");
  revalidateAdmin();
  redirect("/admin/uploads/");
}

// A convention upload is a dead end on its own: photos, a name, maybe a phone
// number, linked to nothing. This turns one into a real lead, so it joins the same
// pipeline as a website enquiry instead of sitting in a separate list.
//
// The contact field is free text, because whoever typed it at a stall might have
// written an email, a phone number, or neither. An email gets a client record; a
// phone number is kept on the submission so the lead is not lost either way.
export async function uploadToSubmission(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const up = await prisma.upload.findUnique({ where: { id } });
  if (!up || up.deletedAt) return;

  const contact = (up.contact ?? "").trim();
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact) ? contact.toLowerCase() : null;
  const phone = email ? null : contact || null;
  const name = (up.name ?? "").trim() || "Upload (no name given)";

  let clientId: string | null = null;
  if (email) {
    const client = await prisma.client.upsert({
      where: { email },
      create: { name, email, phone: phone ?? undefined },
      update: phone ? { phone } : {},
    });
    clientId = client.id;
  }

  const submission = await prisma.submission.create({
    data: {
      name,
      // Submissions need an address to be reachable; without one, record where it
      // came from rather than inventing something that looks real.
      email: email ?? "no-email@upload.kulworks.com",
      phone,
      projectType: "upload",
      message: up.note?.trim() || "Photos uploaded at an event. No note given.",
      storagePaths: up.storagePaths,
      status: "NEW",
      clientId,
    },
  });

  await prisma.upload.update({ where: { id }, data: { status: "HANDLED" } });

  if (clientId) {
    await prisma.activity.create({
      data: {
        type: "NOTE",
        body: `Created from an event upload (${up.storagePaths.length} photo${up.storagePaths.length === 1 ? "" : "s"}).`,
        clientId,
        authorId: profile.id,
      },
    });
  }

  await logAudit(profile.email, "upload.to_submission", `${up.id} -> ${submission.id}`);
  revalidateAdmin();
  redirect(`/admin/submissions/?open=${submission.id}`);
}

export async function markUploadHandled(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.upload.update({ where: { id }, data: { status: "HANDLED" } });
  revalidateAdmin();
  redirect("/admin/uploads/");
}

export async function deleteUpload(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload) return;
  // Remove the image files from storage, then soft-delete the record.
  await removeUploadFiles(upload.storagePaths);
  await prisma.upload.update({
    where: { id },
    data: { deletedAt: new Date(), storagePaths: [] },
  });
  await logAudit(profile.email, "uploads.delete", id);
  revalidateAdmin();
  redirect("/admin/uploads/");
}

// ── Manual progress update to a project's client (only when Sam chooses) ──
export async function sendProjectUpdate(formData: FormData) {
  const { profile } = await requireProfile();
  const projectId = s(formData, "projectId");
  const message = s(formData, "message");
  if (!projectId || !message) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) return;

  const sent = await sendMail({
    to: project.client.email,
    replyTo: site.email,
    subject: `Update on your Kulworks project: ${project.title}`,
    text: `Hi ${project.client.name},\n\n${message}\n\nKulworks`,
  });
  if (!mailSent(sent)) redirect(`/admin/projects/${projectId}/?error=email`);
  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: `Progress update to ${project.client.email}:\n\n${message}`,
      projectId,
      clientId: project.clientId,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "email.project-update", project.client.email);
  revalidateAdmin();
  redirect(`/admin/projects/${projectId}/`);
}

// One-click "we've started your project" email to the client (e.g. after a phone call).
// Auto-fills the project details; only sends on click; logged in Activity.
export async function notifyProjectStarted(formData: FormData) {
  const { profile } = await requireProfile();
  const projectId = s(formData, "projectId");
  if (!projectId) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true },
  });
  if (!project) return;

  const lines = [
    `Hi ${project.client.name},`,
    "",
    "Great news! We've started a project for you at Kulworks:",
    "",
    `Project: ${project.title}`,
  ];
  if (project.requested) lines.push(`What we're doing: ${project.requested}`);
  if (project.deliverables) lines.push(`Deliverables: ${project.deliverables}`);
  if (project.dueDate) lines.push(`Target date: ${project.dueDate.toLocaleDateString("en-US")}`);
  lines.push(
    "",
    "We'll keep you posted as it moves along. Just reply to this email with any questions.",
    "",
    "Kulworks"
  );
  const text = lines.join("\n");

  const sent = await sendMail({
    to: project.client.email,
    replyTo: site.email,
    subject: `We've started your Kulworks project: ${project.title}`,
    text,
  });
  if (!mailSent(sent)) redirect(`/admin/projects/${projectId}/?error=email`);
  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: `Project-started notice emailed to ${project.client.email}.`,
      projectId,
      clientId: project.clientId,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "email.project-started", project.client.email);
  revalidateAdmin();
  redirect(`/admin/projects/${projectId}/`);
}

// ── Quotes & Invoices ──
// Read parallel line-item arrays (itemDesc[], itemQty[], itemPrice[]) from the editor form.
function lineItems(fd: FormData) {
  const descs = fd.getAll("itemDesc").map(String);
  const qtys = fd.getAll("itemQty").map(String);
  const prices = fd.getAll("itemPrice").map(String);
  const out: { description: string; quantity: number; unitPrice: number; position: number }[] = [];
  for (let i = 0; i < descs.length; i++) {
    const description = descs[i]?.trim();
    if (!description) continue;
    out.push({
      description,
      // A blank quantity means one; a typed 0 stays 0 rather than quietly billing one.
      quantity: qtys[i]?.trim() && Number.isFinite(Number(qtys[i])) ? Number(qtys[i]) : 1,
      unitPrice: Number(prices[i]) || 0,
      position: out.length,
    });
  }
  return out;
}

// Create a numbered quote/invoice. The number is picked and the row written inside one
// transaction holding a lock, so two docs made at once (double click, two tabs) can't
// both get the same Q-/INV- number.
async function createNumberedDoc<T>(
  type: "QUOTE" | "INVOICE",
  create: (number: string, tx: Prisma.TransactionClient) => Promise<T>
): Promise<{ number: string; doc: T }> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(4207001)`;
    const rows = await tx.invoice.findMany({ where: { type: type as never }, select: { number: true } });
    // Highest number in use + 1 (not a count, which repeats a number if a row is ever removed).
    const top = rows.reduce((m, r) => Math.max(m, Number(r.number.match(/(\d+)$/)?.[1] ?? 0)), 0);
    const number = `${type === "QUOTE" ? "Q" : "INV"}-${String(top + 1).padStart(4, "0")}`;
    return { number, doc: await create(number, tx) };
  });
}

// Create a quote or invoice (DRAFT) for a project.
export async function createInvoiceDoc(formData: FormData) {
  const { profile } = await requireProfile();
  const projectId = s(formData, "projectId");
  if (!projectId) return;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) redirect("/admin/projects/");

  const type = s(formData, "type") === "QUOTE" ? "QUOTE" : "INVOICE";
  const items = lineItems(formData);
  if (items.length === 0) redirect(`/admin/projects/${projectId}/?error=noitems`);

  const { number } = await createNumberedDoc(type, (number, tx) =>
    tx.invoice.create({
      data: {
        number,
        type: type as never,
        status: "DRAFT",
        projectId,
        clientId: project!.clientId,
        taxRate: num(formData, "taxRate") ?? 0,
        depositPct: num(formData, "depositPct"),
        dueDate: date(formData, "dueDate") ?? undefined,
        notes: s(formData, "notes"),
        items: { create: items },
      },
    })
  );
  await logAudit(profile.email, "invoice.create", `${number}: ${project!.title}`);
  revalidateAdmin();
  redirect(`/admin/projects/${projectId}/?done=doc-created`);
}

// The second half of a split: once the deposit is in and the job is finished,
// this raises an invoice for what is left.
//
// The balance is billed as a single line at a zero service-charge rate on purpose.
// The charge was already applied to the original total, so re-applying it here
// would quietly charge it twice.
export async function createBalanceInvoice(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const src = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, project: true },
  });
  if (!src) return;

  const { total } = computeTotals(src.items, src.taxRate);
  const { balance, hasSplit } = splitDeposit(total, src.depositPct);
  if (!hasSplit || balance <= 0) {
    redirect(`/admin/projects/${src.projectId}/?error=no-balance`);
  }

  // Raising it twice would double-bill, so refuse if one already exists. A quote and
  // the invoice converted from it are one job, so check across both: otherwise the
  // button on each would raise its own balance.
  const marker = `Balance for ${src.number}`;
  const rootId = src.type === "QUOTE" ? src.id : src.sourceQuoteId;
  const existing = await prisma.invoice.findFirst({
    where: {
      deletedAt: null,
      status: { not: "VOID" },
      ...(rootId
        ? { sourceQuoteId: rootId, notes: { startsWith: BALANCE_PREFIX } }
        : { projectId: src.projectId, notes: { contains: marker } }),
    },
    select: { number: true },
  });
  if (existing) {
    redirect(`/admin/projects/${src.projectId}/?error=balance-exists`);
  }

  // The balance follows the deposit. Until a deposit is marked paid somewhere in the
  // job (the quote itself, or the invoice made from it), billing the rest would ask
  // the client for money out of order.
  const depositPaid =
    src.status === "PAID" ||
    (rootId
      ? (await prisma.invoice.count({
          where: {
            deletedAt: null,
            status: "PAID",
            depositPct: { not: null },
            OR: [{ id: rootId }, { sourceQuoteId: rootId }],
          },
        })) > 0
      : false);
  if (!depositPaid) {
    redirect(`/admin/projects/${src.projectId}/?error=deposit-unpaid`);
  }

  const { number } = await createNumberedDoc("INVOICE", (number, tx) =>
    tx.invoice.create({
      data: {
        number,
        type: "INVOICE",
        status: "DRAFT",
        projectId: src.projectId,
        clientId: src.clientId,
        taxRate: 0,
        depositPct: null,
        sourceQuoteId: src.type === "QUOTE" ? src.id : src.sourceQuoteId,
        notes: `${marker}. Deposit of ${src.depositPct}% was billed on ${src.number}; this is the remainder.`,
        items: {
          create: [
            {
              description: `Balance due on ${src.project.title}`,
              quantity: 1,
              unitPrice: balance,
              position: 0,
            },
          ],
        },
      },
    })
  );

  await logAudit(profile.email, "invoice.balance", `${src.number} -> ${number} ($${balance.toFixed(2)})`);
  revalidateAdmin();
  redirect(`/admin/projects/${src.projectId}/?done=balance-created`);
}

// Edit a quote/invoice that has not gone out yet. Drafts only: once a document
// has been sent or paid, its numbers are a record of what the client agreed to,
// so changing them would quietly rewrite history. Void and reissue instead.
export async function updateInvoiceDoc(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true, projectId: true, number: true, notes: true },
  });
  if (!inv) return;
  if (inv.status !== "DRAFT") {
    redirect(`/admin/projects/${inv.projectId}/?error=not-draft`);
  }

  const items = lineItems(formData);
  if (items.length === 0) redirect(`/admin/projects/${inv.projectId}/?error=noitems`);

  await prisma.invoice.update({
    where: { id },
    data: {
      type: (s(formData, "type") === "QUOTE" ? "QUOTE" : "INVOICE") as never,
      taxRate: num(formData, "taxRate") ?? 0,
      depositPct: num(formData, "depositPct"),
      dueDate: date(formData, "dueDate") ?? null,
      notes: keepBalanceMarker(inv.notes, s(formData, "notes")),
      // Replace the lines wholesale; they are only meaningful as a set.
      items: { deleteMany: {}, create: items },
    },
  });

  await logAudit(profile.email, "invoice.update", inv.number);
  revalidateAdmin();
  redirect(`/admin/projects/${inv.projectId}/?done=doc-updated`);
}

// Submission -> project -> draft quote, in one click. The quote system lives on
// projects, so quoting a fresh lead used to mean converting first and remembering
// to come back. This does both and drops you on the project with a quote started.
export async function quoteFromSubmission(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const sub = await prisma.submission.findUnique({ where: { id }, include: { client: true } });
  if (!sub) return;

  // Reuse the project if this submission was already converted.
  let projectId = sub.projectId;
  let clientId = sub.clientId;

  if (!projectId) {
    if (!clientId) {
      const client = await prisma.client.upsert({
        where: { email: sub.email.toLowerCase() },
        create: { name: sub.name, email: sub.email.toLowerCase() },
        update: {},
      });
      clientId = client.id;
    }
    const project = await prisma.project.create({
      data: {
        title: `${sub.name}: ${sub.projectType ?? "project"}`,
        stage: "QUOTED",
        clientId,
        requested: sub.message,
      },
    });
    projectId = project.id;
    await prisma.submission.update({
      where: { id },
      data: { projectId, status: "QUOTED", clientId },
    });
    await prisma.activity.create({
      data: {
        type: "STATUS_CHANGE",
        body: "Created from website submission, ready to quote.",
        projectId,
        clientId,
        authorId: profile.id,
      },
    });
  }

  // Seed a draft quote with one line taken from what they asked for, so there is
  // something to edit rather than an empty form.
  const requested = (sub.projectType ?? sub.message ?? "Custom work").slice(0, 120);
  const { number, doc: invoice } = await createNumberedDoc("QUOTE", (number, tx) =>
    tx.invoice.create({
      data: {
        number,
        type: "QUOTE",
        status: "DRAFT",
        projectId: projectId!,
        clientId: clientId!,
        taxRate: site.payments.defaultServiceCharge,
        items: { create: [{ description: requested, quantity: 1, unitPrice: 0, position: 0 }] },
      },
    })
  );

  await logAudit(profile.email, "quote.from_submission", `${number}: ${sub.email}`);
  revalidateAdmin();
  redirect(`/admin/projects/${projectId}/?done=quote-started#doc-${invoice.id}`);
}

// Email the quote/invoice to the client (link to the public view+pay page). Manual only.
export async function sendInvoiceDoc(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true, project: true },
  });
  if (!inv || inv.status === "VOID") return;

  const { total } = computeTotals(inv.items, inv.taxRate);
  const { dueNow, balance, hasSplit } = splitDeposit(total, inv.depositPct);
  const url = `${SITE_URL}/invoice/${inv.token}/`;
  const isQuote = inv.type === "QUOTE";
  const isPaid = inv.status === "PAID";
  // A quote's clock starts the first time it goes out; resending keeps the date,
  // unless it has already run out. Resending an expired quote is a fresh offer, and
  // an email promising "good through" a past date would land on an expired page.
  const validUntil = isQuote
    ? inv.validUntil && !quoteExpired(inv.validUntil)
      ? inv.validUntil
      : defaultValidUntil()
    : null;

  // The shared Drive folder lives on the submission that started the project, so
  // the one email can carry artwork, money and the address ask together.
  const linkedSub = await prisma.submission.findFirst({
    where: { projectId: inv.projectId, driveFolderUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { driveFolderUrl: true },
  });
  const includeDrive = formData.get("includeDrive") === "on" && !!linkedSub?.driveFolderUrl;

  const lines = [
    `Hi ${inv.client.name},`,
    "",
    isQuote
      ? `Here's your quote from Kulworks (${inv.number}) for "${inv.project.title}":`
      : `Here's your invoice from Kulworks (${inv.number}) for "${inv.project.title}":`,
    "",
    `Total: $${total.toFixed(2)}`,
    hasSplit ? `To book it: $${dueNow.toFixed(2)} now, $${balance.toFixed(2)} on completion.` : "",
    inv.dueDate ? `Due: ${inv.dueDate.toLocaleDateString("en-US")}` : "",
    validUntil ? `This quote is good through ${fmtValidDate(validUntil)}.` : "",
    "",
    !isPaid && (hasSplit || !isQuote) ? "View and pay it here:" : "View it here:",
    url,
    "",
    "That same page has a short form for your shipping address, so we have everything we need to start.",
    includeDrive ? "" : null,
    includeDrive ? "Your artwork folder (upload files or review proofs here):" : null,
    includeDrive ? linkedSub!.driveFolderUrl! : null,
    "",
    "Thank you!",
    "Kulworks",
  ].filter((l) => l !== null && l !== "") as string[];

  await sendMail({
    to: inv.client.email,
    replyTo: site.email,
    subject: `Your Kulworks ${isQuote ? "quote" : "invoice"}: ${inv.number}`,
    text: lines.join("\n"),
  });
  await prisma.invoice.update({
    where: { id },
    data: {
      status: inv.status === "PAID" ? "PAID" : "SENT",
      issuedAt: inv.issuedAt ?? new Date(),
      ...(validUntil ? { validUntil, extendRequestedAt: null } : {}),
    },
  });
  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: `${docLabel(inv.type)} ${inv.number} emailed to ${inv.client.email} ($${total.toFixed(2)}).`,
      projectId: inv.projectId,
      clientId: inv.clientId,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "invoice.send", `${inv.number} → ${inv.client.email}`);
  revalidateAdmin();
  redirect(`/admin/projects/${inv.projectId}/?done=doc-sent`);
}

// Mark an invoice paid → records a Payment on the project + logs it.
export async function markInvoicePaid(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!inv) return;

  const { total: fullTotal } = computeTotals(inv.items, inv.taxRate);
  const split = splitDeposit(fullTotal, inv.depositPct);
  // A plain quote is an estimate with nothing to pay. A quote with a deposit is
  // payable (the client can pay that deposit straight off the quote page).
  if (inv.type === "QUOTE" && !split.hasSplit) return;
  // Once a quote has its invoice, the deposit is collected there. Checked here too (not
  // just by hiding the button) so a stale tab can't record the same deposit twice.
  if (inv.type === "QUOTE") {
    const converted = await prisma.invoice.count({
      where: {
        sourceQuoteId: inv.id,
        deletedAt: null,
        status: { not: "VOID" },
        OR: [{ notes: null }, { NOT: { notes: { startsWith: BALANCE_PREFIX } } }],
      },
    });
    if (converted > 0) redirect(`/admin/projects/${inv.projectId}/?error=already-converted`);
  }
  // On a split, this document only collects the deposit; the balance is billed on
  // its own invoice. Recording the full total here would count the balance twice.
  const total = split.dueNow;
  const method = s(formData, "method") ?? "OTHER";
  // Flip the status only if it is still unpaid, in one statement: a double tap or a
  // stale second tab then records one payment, not two.
  const flipped = await prisma.invoice.updateMany({
    where: { id, status: { notIn: ["PAID", "VOID"] } },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (flipped.count === 0) {
    redirect(`/admin/projects/${inv.projectId}/?error=already-paid`);
  }
  await prisma.payment.create({
    data: {
      projectId: inv.projectId,
      amount: total,
      method: (PAYMENT_METHODS.includes(method) ? method : "OTHER") as never,
      note: `${docLabel(inv.type)} ${inv.number}`,
    },
  });
  await prisma.activity.create({
    data: {
      type: "PAYMENT",
      body: `${inv.number} marked ${split.hasSplit ? "deposit " : ""}paid: $${total.toFixed(2)} (${method}).`,
      projectId: inv.projectId,
      clientId: inv.clientId,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "invoice.paid", `${inv.number} $${total.toFixed(2)} (${method})`);
  revalidateAdmin();
  redirect(`/admin/projects/${inv.projectId}/?done=doc-paid`);
}

// Cancel a quote/invoice (kept as VOID — never hard-deleted).
export async function voidInvoiceDoc(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv) return;
  await prisma.invoice.update({ where: { id }, data: { status: "VOID" } });
  await logAudit(profile.email, "invoice.void", inv.number);
  revalidateAdmin();
  redirect(`/admin/projects/${inv.projectId}/?done=doc-void`);
}

// Turn an approved quote into an invoice (copies the line items).
export async function convertQuoteToInvoice(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const q = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!q || q.type !== "QUOTE" || q.status === "VOID") return;
  // A deposit already paid on the quote means the job is booked; what is left is the
  // balance ("Invoice the balance"), not a second deposit invoice.
  if (q.status === "PAID") {
    redirect(`/admin/projects/${q.projectId}/?error=quote-deposit-paid`);
  }
  // One invoice per quote. A second click would bill the client twice.
  const already = await prisma.invoice.findFirst({
    where: {
      sourceQuoteId: q.id,
      deletedAt: null,
      status: { not: "VOID" },
      // A null note is "not a balance" too; NOT on its own would skip those rows.
      OR: [{ notes: null }, { NOT: { notes: { startsWith: BALANCE_PREFIX } } }],
    },
    select: { number: true },
  });
  if (already) {
    redirect(`/admin/projects/${q.projectId}/?error=already-converted`);
  }

  const { number } = await createNumberedDoc("INVOICE", (number, tx) =>
    tx.invoice.create({
      data: {
        number,
        type: "INVOICE",
        status: "DRAFT",
        projectId: q.projectId,
        clientId: q.clientId,
        taxRate: q.taxRate,
        depositPct: q.depositPct, // keep the split; converting shouldn't quietly bill in full
        sourceQuoteId: q.id, // so the quote page can show this invoice once it is sent
        dueDate: q.dueDate ?? undefined,
        notes: q.notes,
        items: {
          create: q.items.map((it, i) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            position: i,
          })),
        },
      },
    })
  );
  await logAudit(profile.email, "invoice.convert", `${q.number} → ${number}`);
  revalidateAdmin();
  redirect(`/admin/projects/${q.projectId}/?done=doc-converted`);
}

// Set (or extend) how long a quote holds. Allowed on sent quotes too: extending
// one is the whole point, and it changes no numbers the client agreed to.
export async function setQuoteValidUntil(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  const v = s(formData, "validUntil");
  if (!id || !v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
  const q = await prisma.invoice.findUnique({ where: { id }, select: { type: true, projectId: true, clientId: true, number: true } });
  if (!q || q.type !== "QUOTE") return;
  const validUntil = new Date(`${v}T00:00:00Z`);
  await prisma.invoice.update({ where: { id }, data: { validUntil, extendRequestedAt: null } });
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `${q.number} now good through ${fmtValidDate(validUntil)}.`,
      projectId: q.projectId,
      clientId: q.clientId,
      authorId: profile.id,
    },
  });
  await logAudit(profile.email, "quote.valid_until", `${q.number} → ${v}`);
  revalidateAdmin();
  redirect(`/admin/projects/${q.projectId}/?done=doc-updated`);
}

// ── Newsletter: compose + send a broadcast to the Resend Audience ──
function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendBroadcast(formData: FormData) {
  const { profile } = await requireProfile();
  const subject = s(formData, "subject");
  const body = s(formData, "body");
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!subject || !body || !audienceId || !resend) {
    redirect("/admin/newsletter/?error=1");
  }

  const html =
    body!
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("") +
    `<p style="color:#888;font-size:12px;margin-top:24px">You're receiving this because you subscribed at kulworks.com. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>.</p>`;

  const created = await resend!.broadcasts.create({
    audienceId: audienceId!,
    from: FROM,
    subject: subject!,
    html,
  });
  // Resend returns failures instead of throwing; only report "sent" when it really went.
  const sent = created.data?.id ? await resend!.broadcasts.send(created.data.id) : null;
  if (!sent || sent.error) {
    await logError(
      new Error(`Broadcast failed: ${created.error?.message ?? sent?.error?.message ?? "no id"}`),
      "sendBroadcast"
    );
    redirect("/admin/newsletter/?error=send");
  }
  await logAudit(profile.email, "newsletter.send", subject!);
  revalidateAdmin();
  redirect("/admin/newsletter/?sent=1");
}
