// Google Calendar integration: push project due/delivery dates and reminders onto a
// dedicated "Kulworks" calendar as all-day events. One-way (app → calendar): the admin
// dashboard is the source of truth; edits made in the app update the same event (we
// store its id), and deletes remove it. Edits made directly in Google Calendar are NOT
// read back.
//
// Everything here is BEST-EFFORT: if Google is unreachable or not configured, calls
// return null and the caller carries on — a calendar hiccup must never block a save.
//
// Setup: refresh token must include the Calendar scope (re-run `npm run google:auth`),
// and GOOGLE_CALENDAR_ID must point at the Kulworks calendar (`npm run google:calendar`).
import { getGoogleAccessToken, googleConfigured } from "@/lib/google-oauth";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const API = "https://www.googleapis.com/calendar/v3";

export function calendarConfigured(): boolean {
  return googleConfigured() && !!CALENDAR_ID;
}

// YYYY-MM-DD for an all-day event. Dates are stored as midnight; on our servers
// (UTC) that lands on the intended calendar day, so read the UTC components.
function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextDay(d: Date): Date {
  return new Date(d.getTime() + 24 * 60 * 60 * 1000);
}

type EventInput = { summary: string; description?: string; date: Date };

// Create or update an all-day event; returns its event id (or null on failure). Pass an
// existing eventId to update in place. If the event was deleted in Google (404/410), we
// transparently fall back to creating a fresh one.
export async function upsertAllDayEvent(
  eventId: string | null,
  { summary, description, date }: EventInput
): Promise<string | null> {
  if (!calendarConfigured()) return null;
  const token = await getGoogleAccessToken();
  if (!token) return null;

  const body = JSON.stringify({
    summary,
    ...(description ? { description } : {}),
    start: { date: ymd(date) },
    end: { date: ymd(nextDay(date)) }, // end.date is exclusive for all-day events
  });
  const base = `${API}/calendars/${encodeURIComponent(CALENDAR_ID!)}/events`;

  try {
    if (eventId) {
      const res = await fetch(`${base}/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        return data.id ?? eventId;
      }
      if (res.status !== 404 && res.status !== 410) {
        console.error("[calendar] update failed:", res.status, await res.text());
        return eventId; // keep the id; transient failure
      }
      // 404/410 → event is gone; fall through to create a new one.
    }
    const res = await fetch(base, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      console.error("[calendar] create failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (e) {
    console.error("[calendar] upsert error:", e);
    return eventId;
  }
}

// Delete an event. Silently ignores "already gone" (404/410). No-op if not configured.
export async function deleteEvent(eventId: string | null | undefined): Promise<void> {
  if (!eventId || !calendarConfigured()) return;
  const token = await getGoogleAccessToken();
  if (!token) return;
  try {
    const res = await fetch(
      `${API}/calendars/${encodeURIComponent(CALENDAR_ID!)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("[calendar] delete failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[calendar] delete error:", e);
  }
}

// ── High-level helpers used by the admin server actions ──

// Sync a project's due + delivery dates. Returns the (possibly new) event ids to persist
// back on the Project. Clears an event when its date is removed.
export async function syncProjectEvents(p: {
  title: string;
  dueDate: Date | null;
  deliveryDate: Date | null;
  dueEventId: string | null;
  deliveryEventId: string | null;
}): Promise<{ dueEventId: string | null; deliveryEventId: string | null }> {
  if (!calendarConfigured()) {
    return { dueEventId: p.dueEventId, deliveryEventId: p.deliveryEventId };
  }
  let dueEventId = p.dueEventId;
  let deliveryEventId = p.deliveryEventId;

  if (p.dueDate) {
    dueEventId = await upsertAllDayEvent(dueEventId, {
      summary: `Due: ${p.title}`,
      description: "Kulworks project due date.",
      date: p.dueDate,
    });
  } else if (dueEventId) {
    await deleteEvent(dueEventId);
    dueEventId = null;
  }

  if (p.deliveryDate) {
    deliveryEventId = await upsertAllDayEvent(deliveryEventId, {
      summary: `Deliver: ${p.title}`,
      description: "Kulworks project delivery date.",
      date: p.deliveryDate,
    });
  } else if (deliveryEventId) {
    await deleteEvent(deliveryEventId);
    deliveryEventId = null;
  }

  return { dueEventId, deliveryEventId };
}

// Sync a single reminder (Activity of type REMINDER). Returns its event id to persist.
export async function syncReminderEvent(r: {
  body: string;
  remindAt: Date | null;
  done: boolean;
  calendarEventId: string | null;
}): Promise<string | null> {
  if (!calendarConfigured()) return r.calendarEventId;
  // Done or dateless reminders don't belong on the calendar.
  if (!r.remindAt || r.done) {
    if (r.calendarEventId) await deleteEvent(r.calendarEventId);
    return null;
  }
  return upsertAllDayEvent(r.calendarEventId, {
    summary: `Reminder: ${r.body}`,
    description: "Kulworks reminder.",
    date: r.remindAt,
  });
}
