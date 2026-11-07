import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Admin-only download of Rules Helper chat records as JSON (for test sets or training data).
// ?range=24h|7d|30d|all
export async function GET(req: Request) {
  await requireProfile();
  const range = new URL(req.url).searchParams.get("range") ?? "all";
  const ms = ({ "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 } as Record<string, number>)[range] ?? null;
  const rows = await prisma.chatLog.findMany({
    where: ms ? { createdAt: { gte: new Date(Date.now() - ms) } } : {},
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true, question: true, answer: true, outcome: true, model: true,
      latencyMs: true, turn: true, sessionId: true, visitorHash: true, country: true,
    },
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(rows, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rules-helper-chats-${range}-${stamp}.json"`,
    },
  });
}
