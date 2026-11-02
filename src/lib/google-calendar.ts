// Google Calendar integration: push project due/delivery dates and reminders onto a
// dedicated "Kulworks" calendar as all-day events. One-way (app → calendar): the admin
// dashboard is the source of truth; edits made in the app update the same event (we
// store its id), and deletes remove it. Edits made directly in Google Calendar are NOT
// read back.
//
// Everything here is BEST-EFFORT: if Google is unreachable or not configured, calls
// leave stored event ids alone and the caller carries on — a calendar hiccup must never block a save.
//
// Setup: refresh token must include the Calendar scope (re-run `npm run google:auth`),
// and GOOGLE_CALENDAR_ID must point at the Kulworks calendar (`npm run google:calendar`).
import { createHash } from "crypto";
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

// Deterministic event id for a record (e.g. "due:<projectId>"). Google lets the client
// choose the id (base32hex a-v0-9, 5-1024 chars) and refuses a second insert with the
// same id (409), so a create that's retried after a lost response can't duplicate the
// event. Hex digits are a subset of base32hex.
export function calendarEventKey(key: string): string {
  return `kul${createHash("sha1").update(key).digest("hex")}`;
}

// Create or update an all-day event; returns its event id. Pass an existing eventId to
// update in place. If the event was deleted in Google (404/410), we fall back to creating
// a fresh one. When Google can't be reached (no token, network error, 5xx) the existing
// eventId is returned unchanged so the caller keeps it, and null only means "no event".
// Pass `key` (see calendarEventKey) to create with a deterministic id: an id that already
// exists (409, incl. one deleted earlier) is patched back to life instead of duplicated.
export async function upsertAllDayEvent(
  eventId: string | null,
  { summary, description, date }: EventInput,
  key?: string
): Promise<string | null> {
  if (!calendarConfigured()) return eventId;
  const token = await getGoogleAccessToken();
  if (!token) return eventId;

  const fields = {
    summary,
    ...(description ? { description } : {}),
    start: { date: ymd(date) },
    end: { date: ymd(nextDay(date)) }, // end.date is exclusive for all-day events
  };
  const body = JSON.stringify(fields);
  const base = `${API}/calendars/${encodeURIComponent(CALENDAR_ID!)}/events`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    if (eventId) {
      const res = await fetch(`${base}/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers,
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
    const id = key ? calendarEventKey(key) : undefined;
    const res = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify(id ? { id, ...fields } : fields),
    });
    if (res.status === 409 && id) {
      // Already exists (an earlier create whose reply we lost, or a cancelled event):
      // patch it, which also un-cancels it.
      const again = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ...fields, status: "confirmed" }),
      });
      if (again.ok) return id;
      console.error("[calendar] re-use failed:", again.status, await again.text());
      return id; // it exists under this id; keep it so the next save retries the patch
    }
    if (!res.ok) {
      console.error("[calendar] create failed:", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? id ?? null;
  } catch (e) {
    console.error("[calendar] upsert error:", e);
    return eventId;
  }
}

// Delete an event. Returns true when the event is gone (deleted now, or already gone:
// 404/410, or there was no id) and false when it couldn't be removed (not configured,
// no token, network/API error) — callers must keep the stored id in that case so a
// later sync can retry, rather than orphaning the event on the calendar.
export async function deleteEvent(eventId: string | null | undefined): Promise<boolean> {
  if (!eventId) return true;
  if (!calendarConfigured()) return false;
  const token = await getGoogleAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(
      `${API}/calendars/${encodeURIComponent(CALENDAR_ID!)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok || res.status === 404 || res.status === 410) return true;
    console.error("[calendar] delete failed:", res.status, await res.text());
    return false;
  } catch (e) {
    console.error("[calendar] delete error:", e);
    return false;
  }
}

// ── High-level helpers used by the admin server actions ──

// Sync a project's due + delivery dates. Returns the (possibly new) event ids to persist
// back on the Project. Clears an event when its date is removed.
// Pass projectId so creates use deterministic ids (no duplicates on retry).
export async function syncProjectEvents(p: {
  projectId?: string;
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
    }, p.projectId ? `due:${p.projectId}` : undefined);
  } else if (dueEventId) {
    if (await deleteEvent(dueEventId)) dueEventId = null;
  }

  if (p.deliveryDate) {
    deliveryEventId = await upsertAllDayEvent(deliveryEventId, {
      summary: `Deliver: ${p.title}`,
      description: "Kulworks project delivery date.",
      date: p.deliveryDate,
    }, p.projectId ? `delivery:${p.projectId}` : undefined);
  } else if (deliveryEventId) {
    if (await deleteEvent(deliveryEventId)) deliveryEventId = null;
  }

  return { dueEventId, deliveryEventId };
}

// Sync a single reminder (Activity of type REMINDER). Returns its event id to persist.
// Pass activityId so creates use a deterministic id (no duplicates on retry).
export async function syncReminderEvent(r: {
  activityId?: string;
  body: string;
  remindAt: Date | null;
  done: boolean;
  calendarEventId: string | null;
}): Promise<string | null> {
  if (!calendarConfigured()) return r.calendarEventId;
  // Done or dateless reminders don't belong on the calendar.
  if (!r.remindAt || r.done) {
    // Keep the id if the delete didn't go through, so the next sync retries it.
    return (await deleteEvent(r.calendarEventId)) ? null : r.calendarEventId;
  }
  return upsertAllDayEvent(
    r.calendarEventId,
    { summary: `Reminder: ${r.body}`, description: "Kulworks reminder.", date: r.remindAt },
    r.activityId ? `reminder:${r.activityId}` : undefined
  );
}
