"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";
import { resend, FROM, sendMail } from "@/lib/email";
import { createClientFolder, driveConfigured } from "@/lib/google-drive";
import { createAdminClient } from "@/lib/supabase/admin";
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
function date(fd: FormData, k: string): Date | null {
  const v = s(fd, k);
  return v ? new Date(`${v}T00:00:00`) : null;
}

const PROJECT_STAGES = [
  "LEAD", "QUOTED", "APPROVED", "IN_PRODUCTION", "DELIVERED", "CLOSED", "LOST",
];
const SUBMISSION_STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];
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
  // Clear any existing auto-reminder for this project, then recreate if there's a due date.
  await prisma.activity.deleteMany({
    where: { projectId, type: "REMINDER", body: { startsWith: AUTO_TAG } },
  });
  if (!dueDate) return;
  await prisma.activity.create({
    data: {
      type: "REMINDER",
      body: `${AUTO_TAG} "${title}" is due ${dueDate.toLocaleDateString("en-US")}`,
      remindAt: new Date(dueDate.getTime() - REMINDER_LEAD_DAYS * DAY_MS),
      projectId,
    },
  });
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
      title: `${sub.name} — ${sub.projectType ?? "project"}`,
      stage: "LEAD",
      clientId,
      requested: sub.message,
    },
  });

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
  const existing = await prisma.project.findUnique({ where: { id }, select: { stage: true } });

  await prisma.project.update({
    where: { id },
    data: {
      title,
      stage: stage && PROJECT_STAGES.includes(stage) ? (stage as never) : undefined,
      requested: s(formData, "requested"),
      deliverables: s(formData, "deliverables"),
      cardCount: int(formData, "cardCount"),
      cardSize: s(formData, "cardSize"),
      quantity: int(formData, "quantity"),
      finish: s(formData, "finish"),
      specsNotes: s(formData, "specsNotes"),
      quotedAmount: num(formData, "quotedAmount"),
      finalAmount: num(formData, "finalAmount"),
      materialCost: num(formData, "materialCost"),
      devHours: num(formData, "devHours"),
      dueDate,
      startDate: date(formData, "startDate"),
      deliveryDate: date(formData, "deliveryDate"),
      shipStreet: s(formData, "shipStreet"),
      shipCity: s(formData, "shipCity"),
      shipState: s(formData, "shipState"),
      shipPostalCode: s(formData, "shipPostalCode"),
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

  // Keep the due-date auto-reminder in sync.
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

// ── Clients ──
export async function updateClient(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.client.update({
    where: { id },
    data: {
      name: s(formData, "name") ?? "Unnamed",
      phone: s(formData, "phone"),
      company: s(formData, "company"),
      street: s(formData, "street"),
      city: s(formData, "city"),
      state: s(formData, "state"),
      postalCode: s(formData, "postalCode"),
      country: s(formData, "country"),
      notes: s(formData, "notes"),
    },
  });
  await logAudit(profile.email, "update.client", id);
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
  if (!projectId || amount === null) return;
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
  await prisma.activity.create({
    data: {
      type: "REMINDER",
      body,
      remindAt,
      projectId: s(formData, "projectId"),
      clientId: s(formData, "clientId"),
      authorId: profile.id,
    },
  });
  revalidateAdmin();
}

export async function completeReminder(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.activity.update({ where: { id }, data: { done: true } });
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
  await prisma.activity.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidateAdmin();
}

export async function deleteProject(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const now = new Date();
  // Archive the project + its payments & activities; unlink submissions so they can
  // be re-converted. Nothing is hard-deleted.
  await prisma.payment.updateMany({ where: { projectId: id }, data: { deletedAt: now } });
  await prisma.activity.updateMany({ where: { projectId: id }, data: { deletedAt: now } });
  await prisma.submission.updateMany({ where: { projectId: id }, data: { projectId: null } });
  await prisma.project.update({ where: { id }, data: { deletedAt: now } });
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
  await prisma.project.update({ where: { id }, data: { deletedAt: null } });
  await prisma.payment.updateMany({ where: { projectId: id }, data: { deletedAt: null } });
  await prisma.activity.updateMany({ where: { projectId: id }, data: { deletedAt: null } });
  await logAudit(profile.email, "restore.project", id);
  revalidateAdmin();
}

export async function restoreActivity(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.activity.update({ where: { id }, data: { deletedAt: null } });
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

// ── Team invites (OWNER only) ──
export async function inviteTeammate(formData: FormData) {
  const { profile } = await requireProfile();
  if (profile.role !== "OWNER") redirect("/admin/team/?error=perm");
  const email = s(formData, "email")?.toLowerCase();
  const role = s(formData, "role") === "OWNER" ? "OWNER" : "STAFF";
  if (!email) return;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/admin/reset/`,
  });
  if (error || !data?.user) {
    await logAudit(profile.email, "team.invite.failed", email);
    redirect("/admin/team/?error=invite");
  }
  await prisma.profile.upsert({
    where: { id: data.user.id },
    create: { id: data.user.id, email, role: role as never },
    update: { role: role as never },
  });
  await logAudit(profile.email, "team.invite", `${email} (${role})`);
  revalidateAdmin();
  redirect("/admin/team/?invited=1");
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
  if (formData.get("includeDriveFolder") === "on" && driveConfigured()) {
    const url = await createClientFolder(
      `${client.name} — ${new Date().toISOString().slice(0, 10)}`
    );
    if (url) {
      body += `\n\nShared folder to exchange files: ${url}`;
      folderNote = " (Drive folder attached)";
    }
  }

  await sendMail({ to: client.email, replyTo: site.email, subject, text: body });

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

  await sendMail({
    to: project.client.email,
    replyTo: site.email,
    subject: `Update on your Kulworks project: ${project.title}`,
    text: `Hi ${project.client.name},\n\n${message}\n\n— Kulworks`,
  });
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

// ── Newsletter: compose + send a broadcast to the Resend Audience ──
function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendBroadcast(formData: FormData) {
  await requireProfile();
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
  if (created.data?.id) {
    await resend!.broadcasts.send(created.data.id);
  }
  revalidateAdmin();
  redirect("/admin/newsletter/?sent=1");
}
