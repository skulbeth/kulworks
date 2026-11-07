// Receives Role to Reign "Rules Helper" chat records, server-to-server.
// Only the roletoreign app can write here: it must send the shared CHATLOG_INGEST_KEY
// (set in BOTH Vercel projects). The raw IP it forwards is hashed and never stored.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { visitorHash } from "@/lib/visitor";
import { logError } from "@/lib/log-error";

export const runtime = "nodejs";

const OUTCOMES = ["answered", "refused_filter", "refused_topic", "refused_model", "filtered_answer", "error"];

function keyOk(sent: string | null): boolean {
  const key = process.env.CHATLOG_INGEST_KEY;
  if (!key || !sent) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);

export async function POST(req: Request) {
  if (!keyOk(req.headers.get("x-chatlog-key"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const question = str(b.question, 2000);
  const outcome = typeof b.outcome === "string" && OUTCOMES.includes(b.outcome) ? b.outcome : null;
  if (!question || !outcome) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  try {
    await prisma.chatLog.create({
      data: {
        site: "roletoreign",
        question,
        answer: str(b.answer, 6000),
        outcome,
        model: str(b.model, 120),
        latencyMs: Number.isFinite(b.latencyMs) ? Math.round(b.latencyMs as number) : null,
        turn: Number.isInteger(b.turn) ? Math.min(Math.max(b.turn as number, 1), 99) : 1,
        sessionId: str(b.sessionId, 64),
        visitorHash: visitorHash(str(b.ip, 64)),
        country: str(b.country, 8),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError(err, "api/chatlog").catch(() => {});
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}
