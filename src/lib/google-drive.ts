// Google Drive integration: create a shared folder for a client's files and return
// its link. No-op (returns null) unless GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN are set.
// Uses the Drive REST API directly (no heavy googleapis dependency).
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const PARENT = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

export function driveConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

async function getAccessToken(): Promise<string | null> {
  if (!driveConfigured()) return null;
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
    console.error("[drive] token refresh failed:", e);
    return null;
  }
}

// Creates a folder (optionally under PARENT), makes it shareable by link (editor so the
// client can drop files in), and returns its web link. Returns null if not configured/fails.
export async function createClientFolder(name: string): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const createRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mimeType: "application/vnd.google-apps.folder",
          ...(PARENT ? { parents: [PARENT] } : {}),
        }),
      }
    );
    const folder = (await createRes.json()) as { id?: string; webViewLink?: string };
    if (!folder.id) {
      console.error("[drive] folder create failed:", folder);
      return null;
    }
    // Anyone with the link can add files (so the client can upload artwork).
    await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "writer", type: "anyone" }),
    });
    return folder.webViewLink ?? `https://drive.google.com/drive/folders/${folder.id}`;
  } catch (e) {
    console.error("[drive] createClientFolder failed:", e);
    return null;
  }
}
