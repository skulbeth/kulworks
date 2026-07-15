// One-time: find-or-create the dedicated "Kulworks" Google Calendar and print its id.
// Run: npm run google:calendar  → copy the printed GOOGLE_CALENDAR_ID into .env.local + Vercel.
//
// Requires GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN (the refresh token must include the
// Calendar scope — re-run `npm run google:auth` first if you added it recently).
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const CAL_NAME = "Kulworks";

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("❌ Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN in .env.local first.");
  console.error("   (Run `npm run google:auth` to get a refresh token that includes the Calendar scope.)");
  process.exit(1);
}

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
    console.error("❌ Could not get an access token:", JSON.stringify(data));
    console.error("   If the scope changed, re-run `npm run google:auth` for a fresh refresh token.");
    process.exit(1);
  }
  return data.access_token;
}

const token = await accessToken();
const auth = { Authorization: `Bearer ${token}` };

// 1. Look for an existing calendar named "Kulworks".
const listRes = await fetch(
  "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",
  { headers: auth }
);
const list = await listRes.json();
const existing = (list.items ?? []).find((c) => c.summary === CAL_NAME);

let id;
if (existing) {
  id = existing.id;
  console.log(`\n✅ Found existing "${CAL_NAME}" calendar.`);
} else {
  // 2. Create it.
  const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: CAL_NAME, description: "Kulworks project dates & reminders", timeZone: "America/Chicago" }),
  });
  const created = await createRes.json();
  if (!created.id) {
    console.error("❌ Could not create the calendar:", JSON.stringify(created));
    process.exit(1);
  }
  id = created.id;
  console.log(`\n✅ Created a new "${CAL_NAME}" calendar.`);
}

console.log("\nAdd this to .env.local AND Vercel (Project → Settings → Environment Variables):\n");
console.log(`GOOGLE_CALENDAR_ID="${id}"\n`);
console.log("Then redeploy (or restart `npm run dev`). New/edited projects & reminders will appear on the Kulworks calendar.");
console.log("Tip: run `npm run calendar:backfill` once to push existing projects & reminders.\n");
