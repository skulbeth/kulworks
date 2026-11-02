// Register / unregister this browser (or the Android app) for push notifications.
// Full admins only (signed in, active, past 2FA): a subscription is where shop alerts get delivered.
import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vapidKeys } from "@/lib/push";

export const runtime = "nodejs";

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

function labelFor(ua: string, hint: unknown): string {
  if (typeof hint === "string" && hint) return hint.slice(0, 60);
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad/i.test(ua)) return "iPhone";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "Mac";
  return "Browser";
}

// The VAPID public key (public by design). The service worker needs it to re-subscribe
// on pushsubscriptionchange when the browser doesn't hand over the old key.
export async function GET() {
  const { publicKey } = await vapidKeys();
  return NextResponse.json({ publicKey });
}

export async function POST(request: Request) {
  const me = await requireApiProfile();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const { profile } = me;

  const body = (await request.json().catch(() => null)) as { subscription?: Sub; label?: string } | null;
  const s = body?.subscription;
  const endpoint = s?.endpoint;
  const p256dh = s?.keys?.p256dh;
  const auth = s?.keys?.auth;
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) {
    return NextResponse.json({ ok: false, error: "Bad subscription" }, { status: 400 });
  }
  const label = labelFor(request.headers.get("user-agent") ?? "", body?.label);
  const device = await prisma.pushDevice.upsert({
    where: { endpoint },
    update: { p256dh, auth, profileId: profile.id, label, failCount: 0 },
    create: { endpoint, p256dh, auth, profileId: profile.id, label },
  });
  return NextResponse.json({ ok: true, id: device.id });
}

export async function DELETE(request: Request) {
  if (!(await requireApiProfile())) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) await prisma.pushDevice.deleteMany({ where: { endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
