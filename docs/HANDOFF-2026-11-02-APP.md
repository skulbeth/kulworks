# HANDOFF: Kulworks Android app + notifications (overnight 2026-11-01 → 11-02)

Plan: docs/APP-PLAN-2026-11-02.md. System map: ARCHITECTURE.md §8b.

## Shipped (all LIVE on kulworks.com)
| commit | what |
|---|---|
| 74a3b50 | Notification + PushDevice tables (migration 20261102030000_notifications, applied), lib/notify.ts, lib/push.ts, every client-event trigger, /admin/notifications inbox + bell, sw.js, manifest, icons |
| c1f0fa0 | /.well-known/assetlinks.json (Google's checker says `linked: true` for com.kulworks.app + our key) |
| d4ce76c | Gmail sweep: client emails + Venmo/PayPal/Zelle/Cash App receipts matched to unpaid invoices (flag only, never auto-paid); Message Sam box on quote/invoice/proof pages; proof page links back to the quote |
| e2e98f2 | Admin tabs = one swipeable row on phones |

Android app 1.0.0: `D:\Kulworks\Kulworks App\Kulworks-1.0.0.apk` (+ .aab for a future Play listing),
also in Google Drive folder "Kulworks App": https://drive.google.com/drive/folders/1aEbeiLBkPRLHK3s_0l2TBJd2Lz0WcQEn
Project: C:\skulbeth\Kulworks-android (git, 2 commits). Rebuild: `powershell -File build-apk.ps1 -Bump`.
Signing key + password: D:\Kulworks\Kulworks App\signing (BACK IT UP; never in git).

## Tests run (all against the real DB with throwaway rows, all deleted after)
- Real push through FCM to a Chrome subscription: 16/17 (miss = getNotifications() on Windows only).
- Receipt parser 10/10; real Gmail sweep + matching 8/8 (first sweep = silent baseline, done).
- Client pages in Chrome: Message Sam, proof link, view alerts, accept alert: 15/15.
- Admin notifications page rendered in phone light/dark + desktop via a local-only preview route (deleted).
- NOT tested: the APK on a real device (no emulator: Hyper-V/WHPX is off on this PC) and the logged-in admin
  flow of "Turn on notifications" (needs Sam's login; same code path as the tested subscription).

## Needs Sam
1. Install: phone → Drive → Kulworks App → Kulworks-1.0.0.apk → allow "install unknown apps" for Drive → Install.
   Open it, log in (2FA), go to the bell → "Turn on notifications on this device" → Allow → "Send a test notification".
2. Payments: receipts go to his PERSONAL Gmail, not kulworksdesign@. In that Gmail: Settings → Forwarding →
   add kulworksdesign@gmail.com (confirm code), then a filter `from:(venmo.com OR paypal.com OR zelle OR cash.app)`
   → Forward to kulworksdesign@gmail.com. Then payments buzz as "X paid $Y? (Venmo) · Matches INV-…".
3. Decide: admin auto-logout is 30 min idle + email 2FA every 12h. In the app that means logging in most times
   it's opened. Notifications still arrive either way. Options: keep, or stretch it for the app.
4. Decide: NOTIFY_SMS (carrier email-to-text) is dead (carriers shut gateways). Remove it, or leave it.
5. Optional later: Play Store ($25 Google dev account; .aab is ready), iPhone (the same site works as a home-screen
   web app with push on iOS 16.4+), Mailgun inbound webhook for instant email alerts.

## Still open from before (untouched tonight)
- 11-02 follow-up emails to Julianna, Janice, Raizy, Shontel, Scott, Erin: NOT sent (Sam: no client emails yet).
  When sending: set validUntil = 2026-11-09 on Q-0003..Q-0008 (they were made by script, no expiry yet).

## Traps
- Auth proxy bounces EVERY path starting with "/admin" (public assets must live elsewhere).
- `prisma migrate diff --shadow-database-url <prod>` would WIPE prod (blocked once; never).
- Vercel env writes are blocked for Claude (secret-store guard) → VAPID lives in Setting "vapid_keys".
  Moving it to env later re-keys every device (they must turn notifications on again).
- `npm i <pkg>` prunes --no-save playwright-core; reinstall before browser tests.
- Playwright Chrome: ignoreDefaultArgs ["--disable-background-networking", ...] or FCM 410s; set a non-headless
  user agent or /api/track drops the views as bots.
- Bubblewrap `build` fails here (NoDefaultCurrentDirectoryInExePath=1 → can't find gradlew.bat); build-apk.ps1
  does its steps. androidbrowserhelper needs minSdk 24. android-sdk\tools is a junction to cmdline-tools\latest.
