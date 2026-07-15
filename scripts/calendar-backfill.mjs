// One-time backfill: push EXISTING (already-saved) projects and open reminders onto the
// Kulworks calendar, storing each event id back on the record so future edits update the
// same event. Safe to re-run — records that already have an event id are skipped.
//   Run: npm run calendar:backfill
import { PrismaClient } from "@prisma/client";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const API = "https://www.googleapis.com/calendar/v3";

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !CALENDAR_ID) {
  console.error("❌ Need GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN + GOOGLE_CALENDAR_ID in .env.local.");
  console.error("   Run `npm run google:auth` then `npm run google:calendar` first.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("❌ token refresh failed:", JSON.stringify(data));
    process.exit(1);
  }
  return data.access_token;
}

const ymd = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const nextDay = (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000);

const token = await accessToken();
const base = `${API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;

async function createEvent(summary, description, date) {
  const res = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary,
      description,
      start: { date: ymd(date) },
      end: { date: ymd(nextDay(date)) },
    }),
  });
  if (!res.ok) {
    console.error("  ⚠️  create failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.id ?? null;
}

let made = 0;

// Projects: due + delivery dates (only those not already synced).
const projects = await prisma.project.findMany({
  where: { deletedAt: null, OR: [{ dueDate: { not: null } }, { deliveryDate: { not: null } }] },
  select: { id: true, title: true, dueDate: true, deliveryDate: true, dueEventId: true, deliveryEventId: true },
});
for (const p of projects) {
  const data = {};
  if (p.dueDate && !p.dueEventId) {
    const id = await createEvent(`Due: ${p.title}`, "Kulworks project due date.", p.dueDate);
    if (id) { data.dueEventId = id; made++; }
  }
  if (p.deliveryDate && !p.deliveryEventId) {
    const id = await createEvent(`Deliver: ${p.title}`, "Kulworks project delivery date.", p.deliveryDate);
    if (id) { data.deliveryEventId = id; made++; }
  }
  if (Object.keys(data).length) await prisma.project.update({ where: { id: p.id }, data });
}

// Reminders: open (not done), have a date, not already synced.
const reminders = await prisma.activity.findMany({
  where: { type: "REMINDER", done: false, deletedAt: null, remindAt: { not: null }, calendarEventId: null },
  select: { id: true, body: true, remindAt: true },
});
for (const r of reminders) {
  const id = await createEvent(`Reminder: ${r.body}`, "Kulworks reminder.", r.remindAt);
  if (id) { await prisma.activity.update({ where: { id: r.id }, data: { calendarEventId: id } }); made++; }
}

console.log(`\n✅ Backfill complete — created ${made} calendar event(s) across ${projects.length} project(s) and ${reminders.length} reminder(s).\n`);
await prisma.$disconnect();
