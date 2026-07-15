// One-lead, full-lifecycle end-to-end smoke test.
//
// Drives a single test lead through EVERY notification + data path:
//   Submission (real POST /api/quote): Client+Submission rows, Sam-notify email,
//     customer confirmation email, SMS ping, Drive folder + email.
//   Admin (same DB writes + live Resend/Calendar calls the server actions make):
//     convert→project, due+delivery dates → calendar events + auto-reminder,
//     manual reminder → event, payment, project-started email, progress-update email.
//   Cron: GET /api/cron/reminders (digest email to Sam).
//
// Requires the dev server on :3002 (with Turnstile disabled for the run). Run via:
//   TURNSTILE_SECRET_KEY="" npm run dev      (in one terminal)
//   npm run e2e                              (in another)
//
// Leaves the test lead + its 4 calendar events in place, clearly labeled, so you can
// inspect them. Re-running first wipes the previous test lead (idempotent).
import { PrismaClient } from "@prisma/client";

const BASE = process.env.E2E_BASE || "http://localhost:3002";
const prisma = new PrismaClient();

const SAM = process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com";
const TEST_EMAIL = "kulworksdesign+e2etest@gmail.com"; // +alias → lands in Sam's inbox
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const CAL_API = "https://www.googleapis.com/calendar/v3";

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log(`  ✅ ${msg}`); }
  else { fail++; fails.push(msg); console.log(`  ❌ ${msg}`); }
}
function step(t) { console.log(`\n── ${t} ──`); }

const day = 86400000;
const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
const nextDay = (d) => new Date(d.getTime() + day);
// mirror the app's date() parser: a YYYY-MM-DD input → local midnight Date
const dateFromNow = (n) => new Date(`${ymd(new Date(Date.now() + n*day))}T00:00:00`);

// ── live service helpers (same endpoints the app's libs use) ──
async function googleToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  return (await r.json()).access_token;
}
let GTOKEN;
async function calCreate(summary, date) {
  const r = await fetch(`${CAL_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
    method: "POST", headers: { Authorization: `Bearer ${GTOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary, start: { date: ymd(date) }, end: { date: ymd(nextDay(date)) } }),
  });
  if (!r.ok) return null;
  return (await r.json()).id ?? null;
}
async function calGet(id) {
  const r = await fetch(`${CAL_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${GTOKEN}` } });
  if (!r.ok) return null;
  return r.json();
}
async function calDelete(id) {
  if (!id) return;
  await fetch(`${CAL_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${GTOKEN}` } });
}
async function sendEmail(to, subject, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM, to, subject, text, reply_to: "contact@kulworks.com" }),
  });
  const d = await r.json();
  return { ok: r.ok, id: d.id, error: d.message };
}

// ── 0. Clean any prior test lead (idempotent) ──
step("0. Reset — remove any previous E2E test lead + its calendar events");
GTOKEN = await googleToken();
ok(!!GTOKEN, "google access token obtained");
{
  const prior = await prisma.client.findUnique({ where: { email: TEST_EMAIL }, select: { id: true } });
  if (prior) {
    const projs = await prisma.project.findMany({ where: { clientId: prior.id }, select: { id: true, dueEventId: true, deliveryEventId: true } });
    const acts = await prisma.activity.findMany({ where: { clientId: prior.id }, select: { calendarEventId: true } });
    for (const p of projs) { await calDelete(p.dueEventId); await calDelete(p.deliveryEventId); }
    for (const a of acts) await calDelete(a.calendarEventId);
    const projIds = projs.map((p) => p.id);
    await prisma.payment.deleteMany({ where: { projectId: { in: projIds } } });
    await prisma.activity.deleteMany({ where: { clientId: prior.id } });
    await prisma.submission.deleteMany({ where: { clientId: prior.id } });
    await prisma.project.deleteMany({ where: { clientId: prior.id } });
    await prisma.client.delete({ where: { id: prior.id } });
    console.log("  (cleared previous test lead)");
  }
}

// ── 1. Submission side — real /api/quote ──
step("1. Submission — POST /api/quote (validation, DB, notify+confirm+SMS+Drive emails)");
const quoteRes = await fetch(`${BASE}/api/quote/`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "E2E Test Lead", email: TEST_EMAIL, phone: "210-555-0100",
    projectType: "card-printing", driveFolder: true, turnstileToken: "e2e-dummy",
    message: "E2E SMOKE TEST — automated. Please ignore. 500 poker decks, custom backs.",
  }),
});
const quoteJson = await quoteRes.json().catch(() => ({}));
ok(quoteRes.status === 200 && quoteJson.ok === true, `POST /api/quote → 200 ok (got ${quoteRes.status})`);

// small wait for the endpoint's async DB write + drive folder
await new Promise((r) => setTimeout(r, 2500));

const client = await prisma.client.findUnique({ where: { email: TEST_EMAIL } });
ok(!!client, "Client row upserted (SQL: Client)");
ok(client?.phone === "210-555-0100", "Client.phone saved");
const submission = await prisma.submission.findFirst({ where: { email: TEST_EMAIL }, orderBy: { createdAt: "desc" } });
ok(!!submission, "Submission row created (SQL: Submission)");
ok(submission?.projectType === "card-printing", "Submission.projectType saved");
ok(submission?.driveFolder === true, "Submission.driveFolder flag saved");
ok(!!submission?.driveFolderUrl, `Drive folder auto-created + linked (${submission?.driveFolderUrl ? "url set" : "MISSING"})`);
console.log("  → emails triggered by endpoint: Sam-notify, customer confirmation, Drive-folder link, SMS ping (check inbox/phone)");

// ── 2. Convert submission → project ──
step("2. Admin — convert submission → project");
const project = await prisma.project.create({
  data: { title: `${submission.name} — ${submission.projectType}`, stage: "LEAD", clientId: client.id, requested: submission.message, deliverables: "500 printed poker decks + custom tuck boxes" },
});
await prisma.submission.update({ where: { id: submission.id }, data: { projectId: project.id, status: "CONTACTED" } });
await prisma.activity.create({ data: { type: "STATUS_CHANGE", body: "Created from website submission.", projectId: project.id, clientId: client.id } });
const linkedSub = await prisma.submission.findUnique({ where: { id: submission.id } });
ok(linkedSub?.projectId === project.id && linkedSub?.status === "CONTACTED", "Submission linked to Project + status CONTACTED");

// ── 3. Set due + delivery dates → calendar events + auto-reminder ──
step("3. Admin — set due + delivery dates (calendar events + auto-reminder)");
const due = dateFromNow(14);
const delivery = dateFromNow(21);
const dueEventId = await calCreate(`Due: ${project.title}`, due);
const deliveryEventId = await calCreate(`Deliver: ${project.title}`, delivery);
await prisma.project.update({ where: { id: project.id }, data: { dueDate: due, deliveryDate: delivery, dueEventId, deliveryEventId } });
ok(!!dueEventId, "due-date calendar event created");
ok(!!deliveryEventId, "delivery-date calendar event created");
ok(!!(await calGet(dueEventId)), "due event confirmed present on calendar");
ok(!!(await calGet(deliveryEventId)), "delivery event confirmed present on calendar");
// auto-reminder (3 days before due) + its event
const autoRemindAt = new Date(due.getTime() - 3*day);
const autoBody = `[auto] "${project.title}" is due ${due.toLocaleDateString("en-US")}`;
const autoEventId = await calCreate(`Reminder: ${autoBody}`, autoRemindAt);
const autoReminder = await prisma.activity.create({ data: { type: "REMINDER", body: autoBody, remindAt: autoRemindAt, projectId: project.id, calendarEventId: autoEventId } });
ok(!!autoEventId && !!autoReminder.calendarEventId, "auto-reminder (due-3d) created + on calendar");

// ── 4. Manual reminder → calendar event ──
step("4. Admin — add a manual reminder");
const manualAt = dateFromNow(7);
const manualEventId = await calCreate("Reminder: Call client to confirm artwork", manualAt);
const manualReminder = await prisma.activity.create({ data: { type: "REMINDER", body: "Call client to confirm artwork", remindAt: manualAt, projectId: project.id, clientId: client.id, calendarEventId: manualEventId } });
ok(!!manualEventId && !!(await calGet(manualEventId)), "manual reminder created + on calendar");

// ── 5. Payment ──
step("5. Admin — record a payment");
await prisma.payment.create({ data: { projectId: project.id, amount: 250, method: "VENMO", note: "E2E deposit" } });
const paid = (await prisma.payment.aggregate({ where: { projectId: project.id, deletedAt: null }, _sum: { amount: true } }))._sum.amount ?? 0;
ok(paid === 250, `Payment recorded (SQL: Payment) — total paid $${paid}`);

// ── 6. Project-started email ──
step("6. Admin — 'notify client: project started' email");
const startedText = [`Hi ${client.name},`, "", "Great news — we've started a project for you at Kulworks:", "", `Project: ${project.title}`, `Target date: ${due.toLocaleDateString("en-US")}`, "", "— Kulworks"].join("\n");
const startedMail = await sendEmail(TEST_EMAIL, `We've started your Kulworks project: ${project.title}`, startedText);
ok(startedMail.ok && !!startedMail.id, `project-started email sent (${startedMail.id || startedMail.error})`);
await prisma.activity.create({ data: { type: "EMAIL_SENT", body: `Project-started notice emailed to ${TEST_EMAIL}.`, projectId: project.id, clientId: client.id } });

// ── 7. Progress-update email ──
step("7. Admin — 'send progress update' email");
const updMsg = "Your decks are printing now — proofs looked great. Expect delivery next week.";
const updMail = await sendEmail(TEST_EMAIL, `Update on your Kulworks project: ${project.title}`, `Hi ${client.name},\n\n${updMsg}\n\n— Kulworks`);
ok(updMail.ok && !!updMail.id, `progress-update email sent (${updMail.id || updMail.error})`);
await prisma.activity.create({ data: { type: "EMAIL_SENT", body: `Progress update to ${TEST_EMAIL}:\n\n${updMsg}`, projectId: project.id, clientId: client.id } });

// ── 8. Reminders cron digest (real endpoint) ──
step("8. Cron — GET /api/cron/reminders (digest email to Sam)");
const cronRes = await fetch(`${BASE}/api/cron/reminders/`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
ok(cronRes.status === 200, `cron reminders → 200 (got ${cronRes.status})`);
const cronNoAuth = await fetch(`${BASE}/api/cron/reminders/`);
ok(cronNoAuth.status === 401 || cronNoAuth.status === 403, `cron rejects missing secret (got ${cronNoAuth.status})`);

// ── 9. SQL integrity summary ──
step("9. SQL — row counts for this lead");
const acts = await prisma.activity.count({ where: { projectId: project.id, deletedAt: null } });
const reminders = await prisma.activity.count({ where: { projectId: project.id, type: "REMINDER", deletedAt: null } });
console.log(`  Client 1 · Submission 1 · Project 1 · Payment 1 · Activities ${acts} (of which reminders ${reminders})`);
ok(acts >= 5, `activity timeline populated (${acts} entries)`);
ok(reminders === 2, `exactly 2 reminders (auto + manual) (${reminders})`);

// ── 10. Calendar verification ──
step("10. Calendar — confirm all 4 events are live");
const ids = { due: dueEventId, delivery: deliveryEventId, autoReminder: autoEventId, manualReminder: manualEventId };
for (const [k, id] of Object.entries(ids)) ok(!!(await calGet(id)), `calendar event present: ${k}`);

console.log(`\n════════ RESULT: ${pass} passed, ${fail} failed ════════`);
if (fail) console.log("FAILURES:\n" + fails.map((f) => "  - " + f).join("\n"));
console.log(`\nTest lead left in place for inspection:`);
console.log(`  Admin: /admin/projects (title "${project.title}")`);
console.log(`  Client email (all customer notifications): ${TEST_EMAIL}`);
console.log(`  Calendar: 4 events on the Kulworks calendar (due ${ymd(due)}, delivery ${ymd(delivery)}, +2 reminders)`);
console.log(`  Re-run this script to wipe + recreate it; or ask to clean it up.\n`);
await prisma.$disconnect();
process.exit(fail ? 1 : 0);
