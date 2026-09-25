// Receives a lightweight page-view beacon and logs it to the DB.
//
// Two senders: this site, and Role to Reign (roletoreign.com), which has no
// backend of its own. Its visitors' browsers post here directly, which is what
// keeps geo working: Vercel's edge headers on THIS request describe the real
// visitor, not a server relaying for them.
//
// Cookieless: the client passes an anonymous session id (sessionStorage). Bots
// are skipped. Writes are capped per IP and restricted to known origins.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { visitorHash } from "@/lib/visitor";
import { logError } from "@/lib/log-error";

export const runtime = "nodejs";

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|preview|monitor/i;

// Sites allowed to write rows, and the origins allowed to do it for them.
// A body claiming any other site is recorded as "unknown" rather than trusted.
const SITES = ["kulworks", "roletoreign"] as const;
type Site = (typeof SITES)[number];

const ALLOWED_ORIGINS = [
  "https://kulworks.com",
  "https://www.kulworks.com",
  "https://roletoreign.com",
  "https://www.roletoreign.com",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // same-origin beacons often send no Origin header
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Vercel preview deployments of either project, and local dev.
  return /^https:\/\/(kulworks|roletoreign)-[a-z0-9-]+\.vercel\.app$/.test(origin)
    || /^http:\/\/localhost:\d+$/.test(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function deviceFromUA(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

// Beacons are sent as text/plain so the browser skips the CORS preflight.
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  const ok = () => NextResponse.json({ ok: true }, { headers: cors });

  try {
    if (!isAllowedOrigin(origin)) return ok(); // quietly ignore strangers

    // Cap per-IP tracking to curb bloat/abuse (a real browsing session stays well under).
    if (!(await rateLimit(`track:${clientIp(request)}`, 60, 60_000))) return ok();

    const ua = request.headers.get("user-agent") ?? "";
    if (BOT.test(ua)) return ok();

    // text/plain bodies arrive as text, so parse rather than request.json().
    const raw = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false }, { status: 400, headers: cors });
    }
    const { path, referrer, sessionId, site } = (parsed ?? {}) as Record<string, unknown>;

    if (typeof path !== "string" || !path) {
      return NextResponse.json({ ok: false }, { status: 400, headers: cors });
    }

    const from: Site | "unknown" = SITES.includes(site as Site) ? (site as Site) : "unknown";

    // Drop self-referrals: a view is "direct" if the referrer is the site itself.
    let ref = typeof referrer === "string" && referrer ? referrer : null;
    const selfHost = origin ?? `https://${request.headers.get("host") ?? ""}`;
    if (ref && selfHost) {
      try {
        if (new URL(ref).hostname.replace(/^www\./, "") ===
            new URL(selfHost).hostname.replace(/^www\./, "")) {
          ref = null;
        }
      } catch {
        /* unparseable referrer, keep it as-is */
      }
    }

    await prisma.pageView.create({
      data: {
        site: from,
        path: path.slice(0, 500),
        referrer: ref ? ref.slice(0, 500) : null,
        country: request.headers.get("x-vercel-ip-country"),
        city: request.headers.get("x-vercel-ip-city"),
        device: deviceFromUA(ua),
        sessionId: typeof sessionId === "string" ? sessionId.slice(0, 100) : null,
        visitorHash: visitorHash(clientIp(request)),
      },
    });
    return ok();
  } catch (err) {
    await logError(err, "/api/track");
    // Never let analytics break a page load.
    return ok();
  }
}
