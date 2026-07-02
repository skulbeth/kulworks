// Verifies Google Drive folder creation works end to end (token refresh → create →
// share). Creates a clearly-named test folder you can delete afterward.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const PARENT = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

const tok = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});
const { access_token, error } = await tok.json();
if (!access_token) {
  console.error("❌ token refresh failed:", error);
  process.exit(1);
}
console.log("✅ access token obtained");

const createRes = await fetch(
  "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Kulworks TEST folder (safe to delete)",
      mimeType: "application/vnd.google-apps.folder",
      ...(PARENT ? { parents: [PARENT] } : {}),
    }),
  }
);
const folder = await createRes.json();
if (!folder.id) {
  console.error("❌ folder create failed:", JSON.stringify(folder));
  process.exit(1);
}
await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ role: "writer", type: "anyone" }),
});
console.log("✅ folder created + shared");
console.log("   Link:", folder.webViewLink);
