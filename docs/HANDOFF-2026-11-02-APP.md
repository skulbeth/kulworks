# HANDOFF: Kulworks Android app + notifications (overnight 2026-11-01 → 11-02)

Plan: docs/APP-PLAN-2026-11-02.md. This file is updated as work lands.

## Done
- 74a3b50 notifications hub LIVE: Notification + PushDevice tables (migration 20261102030000_notifications,
  applied), lib/notify.ts, lib/push.ts, triggers on every client event, /admin/notifications inbox + bell,
  sw.js + kulworks-app.webmanifest + icons in public/app/.
- VAPID keys: Vercel env writes were blocked for me (secret-store guard), so lib/push.ts makes a pair on
  first use and stores it in Setting "vapid_keys". Fine to move to env later (VAPID_PUBLIC_KEY /
  VAPID_PRIVATE_KEY) ONLY before any device subscribes, or every device must re-enable.
- Toolchain: C:\skulbeth\_toolchains\jdk17 + android-sdk (platforms 35, build-tools 35.0.0, platform-tools).

## In progress
- Android TWA (Bubblewrap) in C:\skulbeth\Kulworks-android.

## Traps
- The auth proxy (lib/supabase/middleware.ts) bounces EVERY path starting with "/admin", so public assets
  must not start with /admin (that's why it's /kulworks-app.webmanifest).
- `prisma migrate diff --shadow-database-url <prod>` would WIPE prod. Blocked once; never do it.
- `npm i <pkg>` prunes --no-save packages (playwright-core); reinstall with --no-save before browser tests.
- Playwright Chrome needs ignoreDefaultArgs ["--disable-background-networking", ...] or FCM returns 410.
