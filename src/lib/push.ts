// Web Push delivery (VAPID) to every registered device: the Android app and any
// browser Sam turned notifications on in.
//
// Keys: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars when set. Otherwise the server
// makes a pair on first use and keeps it in the Setting table, so push works with no
// manual setup. The pair must never change once devices subscribe (they are bound to
// the public key), which is why it is generated once and stored, not per deploy.
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const KEY = "vapid_keys";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@kulworks.com";

type Keys = { publicKey: string; privateKey: string };
let cached: Keys | null = null;

// Pull one key out of an env value, forgiving a messy paste: surrounding quotes or
// spaces, or the whole {"publicKey":"…","privateKey":"…"} line from the database.
// Returns null unless the result is a real key (base64url, right length), so a bad
// paste can never be served as "the public key" (GET /api/push/ is public).
function envKey(raw: string | undefined, field: keyof Keys): string | null {
  let v = (raw ?? "").trim();
  if (v.startsWith("{")) {
    try {
      v = String((JSON.parse(v) as Partial<Keys>)[field] ?? "");
    } catch {
      return null;
    }
  }
  v = v.replace(/^["']+|["']+$/g, "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return null;
  const bytes = Buffer.from(v, "base64url").length;
  return bytes === (field === "publicKey" ? 65 : 32) ? v : null;
}

export async function vapidKeys(): Promise<Keys> {
  if (cached) return cached;
  if (process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PRIVATE_KEY) {
    const publicKey = envKey(process.env.VAPID_PUBLIC_KEY, "publicKey");
    const privateKey = envKey(process.env.VAPID_PRIVATE_KEY, "privateKey");
    if (publicKey && privateKey) {
      cached = { publicKey, privateKey };
      return cached;
    }
    console.error("[push] VAPID env vars are set but not valid keys; using the stored pair");
  }
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (row) {
    cached = JSON.parse(row.value) as Keys;
    return cached;
  }
  const fresh = webpush.generateVAPIDKeys();
  // Two first requests racing: create-or-keep, then read back whichever won.
  await prisma.setting.upsert({ where: { key: KEY }, update: {}, create: { key: KEY, value: JSON.stringify(fresh) } });
  const won = await prisma.setting.findUnique({ where: { key: KEY } });
  cached = JSON.parse(won!.value) as Keys;
  return cached;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string | null;
  tag?: string; // same tag replaces the previous notification on the phone
  id?: string; // Notification row id, so a tap can mark it read
  urgent?: boolean;
};

/** Send to every device. Returns how many accepted it. Never throws. */
export async function pushToAll(payload: PushPayload): Promise<number> {
  let delivered = 0;
  try {
    // Only devices of admins who still have access.
    const devices = await prisma.pushDevice.findMany({ where: { profile: { deactivatedAt: null } } });
    if (devices.length === 0) return 0;
    const { publicKey, privateKey } = await vapidKeys();
    const body = JSON.stringify(payload);
    await Promise.all(
      devices.map(async (d) => {
        try {
          await webpush.sendNotification(
            { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            body,
            {
              vapidDetails: { subject: SUBJECT, publicKey, privateKey },
              TTL: 60 * 60 * 24,
              urgency: payload.urgent ? "high" : "normal",
              timeout: 8000,
            }
          );
          delivered++;
          await prisma.pushDevice.update({ where: { id: d.id }, data: { lastPushAt: new Date(), failCount: 0 } });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: the browser dropped the subscription (app uninstalled, permission
          // revoked). It will never work again, so forget it.
          // Other 4xx (bad/mismatched VAPID key, malformed sub) are permanent too, but give
          // them a few tries before pruning. 5xx / 429 / 408 / timeouts (no status) are the
          // push service having a bad moment: never count those, the device is fine.
          const permanent4xx = !!status && status >= 400 && status < 500 && status !== 408 && status !== 413 && status !== 429; // 413 = our payload, not the device
          if (status === 404 || status === 410 || (permanent4xx && d.failCount >= 4)) {
            await prisma.pushDevice.delete({ where: { id: d.id } }).catch(() => {});
          } else if (permanent4xx) {
            await prisma.pushDevice.update({ where: { id: d.id }, data: { failCount: { increment: 1 } } }).catch(() => {});
          }
          console.error("[push] send failed", status, (e as Error).message);
        }
      })
    );
  } catch (e) {
    console.error("[push] pushToAll failed", e);
  }
  return delivered;
}
