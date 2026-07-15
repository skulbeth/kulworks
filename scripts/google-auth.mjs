// One-time Google authorize: gets a refresh token so the app can create Drive folders
// AND manage the Kulworks calendar.
// Run: npm run google:auth  → open the printed URL, click Allow → it prints the token.
// (If you authorized before the Calendar scope was added, re-run this and paste the new
// GOOGLE_REFRESH_TOKEN into .env.local + Vercel so calendar sync can write events.)
import http from "node:http";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT = "http://localhost:5055/oauth2callback";
const SCOPE = [
  "https://www.googleapis.com/auth/drive.file", // create/manage client artwork folders
  "https://www.googleapis.com/auth/calendar", // create the Kulworks calendar + manage events
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local first.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth2callback")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const code = new URL(req.url, "http://localhost:5055").searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("No code received.");
    return;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });
  const data = await tokenRes.json();
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2>✅ Authorized. You can close this tab and return to the terminal.</h2>");

  if (data.refresh_token) {
    console.log("\n✅ SUCCESS — refresh token below:\n");
    console.log(`GOOGLE_REFRESH_TOKEN="${data.refresh_token}"\n`);
  } else {
    console.error("\n❌ No refresh_token returned:", JSON.stringify(data));
    console.error("If you've authorized before, revoke at https://myaccount.google.com/permissions and re-run.\n");
  }
  server.close();
  setTimeout(() => process.exit(0), 200);
});

server.listen(5055, () => {
  console.log("\n👉 Open this URL (signed in as kulworksdesign@gmail.com) and click Allow:\n");
  console.log(authUrl + "\n");
  console.log("Waiting for authorization on http://localhost:5055 …\n");
});
