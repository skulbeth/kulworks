// Google Drive integration: create a shared folder for a client's files and return
// its link. No-op (returns null) unless GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN are set.
// Uses the Drive REST API directly (no heavy googleapis dependency).
import { googleConfigured, getGoogleAccessToken } from "@/lib/google-oauth";
import { logError } from "@/lib/log-error";

const PARENT = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

export function driveConfigured(): boolean {
  return googleConfigured();
}

async function getAccessToken(): Promise<string | null> {
  return getGoogleAccessToken();
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
    // Anyone with the link can add files (so the client can upload artwork). Without
    // this the link opens "access denied" for them, so one retry, then no link at all
    // (callers treat null as "not created" and Sam makes it from the admin).
    let shared = false;
    for (let attempt = 0; attempt < 2 && !shared; attempt++) {
      const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "writer", type: "anyone" }),
      });
      shared = permRes.ok;
      if (!shared) {
        await logError(
          new Error(`Drive share failed (${permRes.status}) for folder ${folder.id}: ${(await permRes.text()).slice(0, 300)}`),
          "drive createClientFolder"
        );
      }
    }
    if (!shared) {
      // Don't leave a private, empty folder behind; the admin button makes a fresh one.
      await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      return null;
    }
    return folder.webViewLink ?? `https://drive.google.com/drive/folders/${folder.id}`;
  } catch (e) {
    console.error("[drive] createClientFolder failed:", e);
    return null;
  }
}

/** The folder id inside a Drive folder link (…/folders/<id>?usp=…), or null. */
export function folderIdFromUrl(url: string | null | undefined): string | null {
  const m = /\/folders\/([A-Za-z0-9_-]{10,})/.exec(url ?? "");
  return m ? m[1] : null;
}

/** Give one person edit access to a folder, without Google emailing them (the link is on
 *  their quote page). Google only accepts addresses tied to a Google account; for anyone
 *  else this fails quietly and they use the upload box on the page instead. */
export async function shareFolderWith(folderId: string, email: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token || !email) return false;
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?sendNotificationEmail=false`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Start a resumable upload of one file into a folder and return the session URL. The
 *  browser then PUTs the bytes straight to Google (no size cap from our server, and the
 *  client needs no Google account). `origin` must be the page's origin, or Google refuses
 *  the browser's cross-origin upload. */
export async function startDriveUpload(opts: {
  folderId: string;
  name: string;
  mimeType: string;
  size: number;
  origin: string;
}): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": opts.mimeType,
        "X-Upload-Content-Length": String(opts.size),
        Origin: opts.origin,
      },
      body: JSON.stringify({ name: opts.name, parents: [opts.folderId] }),
    });
    if (!res.ok) {
      await logError(new Error(`Drive upload start failed (${res.status}): ${(await res.text()).slice(0, 300)}`), "drive startDriveUpload");
      return null;
    }
    return res.headers.get("location");
  } catch (e) {
    await logError(e, "drive startDriveUpload");
    return null;
  }
}
