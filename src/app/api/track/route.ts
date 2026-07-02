// Receives a lightweight page-view beacon from the site and logs it to the DB.
// Cookieless: the client passes an anonymous session id (sessionStorage). Geo comes
// from Vercel's edge headers (present in production only). Bots are skipped.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|preview|monitor/i;

function deviceFromUA(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(request: Request) {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (BOT.test(ua)) return NextResponse.json({ ok: true });

    const { path, referrer, sessionId } = await request.json();
    if (typeof path !== "string" || !path) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const host = request.headers.get("host") ?? "";
    let ref = typeof referrer === "string" && referrer ? referrer : null;
    if (ref && host && ref.includes(host)) ref = null; // ignore internal navigation

    await prisma.pageView.create({
      data: {
        path: path.slice(0, 500),
        referrer: ref ? ref.slice(0, 500) : null,
        country: request.headers.get("x-vercel-ip-country"),
        city: request.headers.get("x-vercel-ip-city"),
        device: deviceFromUA(ua),
        sessionId: typeof sessionId === "string" ? sessionId.slice(0, 100) : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Never let analytics break a page load.
    return NextResponse.json({ ok: true });
  }
}
