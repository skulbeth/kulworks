// Shared Google OAuth: exchanges the long-lived refresh token for a short-lived
// access token. Both the Drive and Calendar integrations use this. The access token
// covers whatever scopes the refresh token was granted (Drive + Calendar once you
// re-run `npm run google:auth`), so there's a single code path for both.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

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
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (e) {
    console.error("[google] token refresh failed:", e);
    return null;
  }
}
