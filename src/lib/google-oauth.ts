// Shared Google OAuth: exchanges the long-lived refresh token for a short-lived
// access token. Both the Drive and Calendar integrations use this. The access token
// covers whatever scopes the refresh token was granted (Drive + Calendar once you
// re-run `npm run google:auth`), so there's a single code path for both.
import { logError } from "@/lib/log-error";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// A failing refresh token fails every Google call in a request (a project save makes
// several), so report it to the error log at most once per window instead of per call.
const FAILURE_LOG_WINDOW_MS = 10 * 60 * 1000;
let lastFailureLoggedAt = 0;

async function reportTokenFailure(err: unknown) {
  const now = Date.now();
  if (now - lastFailureLoggedAt < FAILURE_LOG_WINDOW_MS) {
    console.error("[google] token refresh failed:", err instanceof Error ? err.message : err);
    return;
  }
  lastFailureLoggedAt = now;
  await logError(err, "google.oauth token refresh");
}

export function googleConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

export async function getGoogleAccessToken(): Promise<string | null> {
  if (!googleConfigured()) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        refresh_token: REFRESH_TOKEN!,
        grant_type: "refresh_token",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      // e.g. 400 invalid_grant = the refresh token was revoked/expired → re-run google:auth.
      const why = [data.error, data.error_description].filter(Boolean).join(": ");
      await reportTokenFailure(new Error(`HTTP ${res.status}${why ? ` ${why}` : ""}`));
      return null;
    }
    return data.access_token;
  } catch (e) {
    await reportTokenFailure(e);
    return null;
  }
}
