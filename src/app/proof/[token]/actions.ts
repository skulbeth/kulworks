"use server";

// Public actions for the client-facing proof page.
//
// Reachable without a login, so the unguessable proof token IS the credential, the
// same rule as the invoice page. Every action re-checks that the item belongs to the
// proof behind that token and that the link is still switched on. Nothing here
// touches money, and Sam only hears about notes when the client presses "Send".
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { itemLabel, publicProofUrl } from "@/lib/proofs";
import { site } from "@/data/site";

const MAX_NOTE = 2000;
const NOTIFY_TO = () => process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com";

async function liveProof(token: string) {
  if (typeof token !== "string" || token.length > 100) return null;
  const proof = await prisma.proof.findUnique({ where: { token }, include: { project: true } });
  return proof && proof.active && !proof.project.deletedAt ? proof : null;
}

async function itemOf(proofId: string, itemId: string) {
  if (typeof itemId !== "string") return null;
  const item = await prisma.proofItem.findUnique({ where: { id: itemId } });
  return item && item.proofId === proofId ? item : null;
}

function clamp01(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
}

export type NoteInput = {
  token: string;
  itemId: string;
  side: "front" | "back";
  x: number | null;
  y: number | null;
  body: string;
};

export async function addProofNote(input: NoteInput) {
  const proof = await liveProof(input.token);
  if (!proof) return { ok: false as const, error: "This review link is no longer active." };
  if (!(await rateLimit(`proof-note:${proof.id}`, 120, 10 * 60_000)))
    return { ok: false as const, error: "That's a lot of notes at once. Wait a few minutes and try again." };
  const item = await itemOf(proof.id, input.itemId);
  const body = typeof input.body === "string" ? input.body.trim().slice(0, MAX_NOTE) : "";
  if (!item || !body) return { ok: false as const, error: "Write a note first." };

  await prisma.proofComment.create({
    data: {
      itemId: item.id,
      side: input.side === "back" ? "back" : "front",
      x: clamp01(input.x),
      y: clamp01(input.y),
      body,
    },
  });
  revalidatePath(`/proof/${input.token}`);
  return { ok: true as const };
}

/** The client can take back a note until Sam has been sent it. */
export async function deleteProofNote(token: string, commentId: string) {
  const proof = await liveProof(token);
  if (!proof || typeof commentId !== "string") return;
  const c = await prisma.proofComment.findUnique({ where: { id: commentId }, include: { item: true } });
  if (!c || c.item.proofId !== proof.id || !c.fromClient || c.notifiedAt) return;
  await prisma.proofComment.delete({ where: { id: c.id } });
  revalidatePath(`/proof/${token}`);
}

export async function setProofItemApproved(token: string, itemId: string, approved: boolean) {
  const proof = await liveProof(token);
  if (!proof) return;
  const item = await itemOf(proof.id, itemId);
  if (!item) return;
  await prisma.proofItem.update({ where: { id: item.id }, data: { approvedAt: approved ? new Date() : null } });
  revalidatePath(`/proof/${token}`);
}

/** Emails Sam every note he hasn't been sent yet, grouped by card. */
export async function sendProofNotes(token: string) {
  const proof = await liveProof(token);
  if (!proof) return { ok: false as const, error: "This review link is no longer active." };
  if (!(await rateLimit(`proof-send:${proof.id}`, 10, 60 * 60_000)))
    return { ok: false as const, error: "Your notes were already sent. Try again in a little while." };

  const pending = await prisma.proofComment.findMany({
    where: { notifiedAt: null, fromClient: true, item: { proofId: proof.id } },
    include: { item: true },
    orderBy: [{ item: { position: "asc" } }, { createdAt: "asc" }],
  });
  if (!pending.length) return { ok: false as const, error: "There are no new notes to send." };

  const lines: string[] = [];
  let last = "";
  for (const c of pending) {
    const head = `${itemLabel(c.item.key)} (${c.side})`;
    if (head !== last) lines.push("", head);
    last = head;
    lines.push(`- ${c.body}`);
  }
  const adminUrl = `${site.url.replace(/\/+$/, "")}/admin/proofs/${proof.id}/`;
  await sendMail({
    to: NOTIFY_TO(),
    subject: `Proof notes: ${proof.title} (${pending.length})`,
    text: [`${pending.length} new note(s) on "${proof.title}".`, ...lines, "", `Review them: ${adminUrl}`].join("\n"),
  });
  await prisma.proofComment.updateMany({
    where: { id: { in: pending.map((c) => c.id) } },
    data: { notifiedAt: new Date() },
  });
  await prisma.activity.create({
    data: {
      type: "EMAIL_RECEIVED",
      body: `Client sent ${pending.length} proof note(s) on "${proof.title}".`,
      projectId: proof.projectId,
      clientId: proof.project.clientId,
    },
  });
  revalidatePath(`/proof/${token}`);
  return { ok: true as const, count: pending.length };
}

export async function approveWholeProof(token: string) {
  const proof = await liveProof(token);
  if (!proof) return { ok: false as const, error: "This review link is no longer active." };
  const open = await prisma.proofComment.count({
    where: { resolvedAt: null, fromClient: true, item: { proofId: proof.id } },
  });
  const now = new Date();
  await prisma.proof.update({ where: { id: proof.id }, data: { approvedAt: now } });
  await prisma.proofItem.updateMany({ where: { proofId: proof.id, approvedAt: null }, data: { approvedAt: now } });
  await sendMail({
    to: NOTIFY_TO(),
    subject: `Proof APPROVED: ${proof.title}`,
    text: [
      `The client approved every card in "${proof.title}".`,
      open ? `Heads up: ${open} note(s) are still open on it.` : "No open notes.",
      "",
      `Review page: ${publicProofUrl(site.url, proof.token)}`,
    ].join("\n"),
  });
  await prisma.activity.create({
    data: {
      type: "STATUS_CHANGE",
      body: `Client approved the proof "${proof.title}"${open ? ` (${open} note(s) still open)` : ""}.`,
      projectId: proof.projectId,
      clientId: proof.project.clientId,
    },
  });
  revalidatePath(`/proof/${token}`);
  return { ok: true as const };
}
