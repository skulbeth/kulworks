"use server";

// Public actions for the client-facing proof page.
//
// Reachable without a login, so the unguessable proof token IS the credential, the
// same rule as the invoice page. Every action re-checks that the item belongs to the
// proof behind that token and that the link is still switched on. Nothing here
// touches money, and Sam only hears about notes when the client presses "Send".
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { itemLabel, publicProofUrl } from "@/lib/proofs";
import { ensureInvoiceForProject } from "@/lib/auto-invoice";
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
  const now = new Date();
  await prisma.proofItem.update({ where: { id: item.id }, data: { approvedAt: approved ? now : null } });
  if (!approved) {
    // Taking back one card's approval means the proof as a whole isn't approved anymore.
    if (proof.approvedAt) await prisma.proof.update({ where: { id: proof.id }, data: { approvedAt: null } });
  } else if ((await prisma.proofItem.count({ where: { proofId: proof.id, approvedAt: null } })) === 0) {
    // That was the last card: the proof is approved, same as pressing Approve all.
    await claimApproval(proof, now);
  }
  revalidatePath(`/proof/${token}`);
}

type LiveProof = NonNullable<Awaited<ReturnType<typeof liveProof>>>;

// sendMail reports failure as {error} rather than throwing, and {skipped} when there's
// no API key. Skipped counts as sent only outside production (local dev has no key).
function mailSent(r: Awaited<ReturnType<typeof sendMail>>): boolean {
  if ("error" in r && r.error) return false;
  if ("skipped" in r && r.skipped) return process.env.NODE_ENV !== "production";
  return true;
}

/** The client's notes Sam hasn't been sent yet, and the email lines listing them by card. */
async function unsentNotes(proofId: string) {
  const pending = await prisma.proofComment.findMany({
    where: { notifiedAt: null, fromClient: true, item: { proofId } },
    include: { item: true },
    orderBy: [{ item: { position: "asc" } }, { createdAt: "asc" }],
  });
  const lines: string[] = [];
  let last = "";
  for (const c of pending) {
    const head = `${itemLabel(c.item.key)} (${c.side})`;
    if (head !== last) lines.push("", head);
    last = head;
    lines.push(`- ${c.body}`);
  }
  return { pending, lines };
}

/** Emails Sam every note he hasn't been sent yet, grouped by card. */
export async function sendProofNotes(token: string) {
  const proof = await liveProof(token);
  if (!proof) return { ok: false as const, error: "This review link is no longer active." };
  if (!(await rateLimit(`proof-send:${proof.id}`, 10, 60 * 60_000)))
    return { ok: false as const, error: "Your notes were already sent. Try again in a little while." };

  const { pending, lines } = await unsentNotes(proof.id);
  if (!pending.length) return { ok: false as const, error: "There are no new notes to send." };

  const adminUrl = `${site.url.replace(/\/+$/, "")}/admin/proofs/${proof.id}/`;
  const r = await sendMail({
    to: NOTIFY_TO(),
    subject: `Proof notes: ${proof.title} (${pending.length})`,
    text: [`${pending.length} new note(s) on "${proof.title}".`, ...lines, "", `Review them: ${adminUrl}`].join("\n"),
  });
  // Not sent → leave them unsent (and still deletable) so Send can be pressed again.
  if (!mailSent(r))
    return {
      ok: false as const,
      error: "Your notes are saved, but they couldn't be sent just now. Please press Send again in a minute.",
    };
  await prisma.proofComment.updateMany({
    where: { id: { in: pending.map((c) => c.id) } },
    data: { notifiedAt: new Date() },
  });
  // After the response: a slow push service shouldn't hold up the client's page.
  after(() =>
    notify({
      kind: "proof_notes",
      title: `Proof notes: ${proof.title}`,
      body: `${pending.length} new note(s). First: "${pending[0].body.slice(0, 120)}"`,
      url: `/admin/proofs/${proof.id}/`,
      projectId: proof.projectId,
      clientId: proof.project.clientId,
    })
  );
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

/**
 * The proof became approved (Approve all, or the last card approved one at a time).
 * Claims it in one statement: approving again (or twice quickly) on a proof that's
 * already approved changes nothing and doesn't email Sam again. New versions from Sam,
 * or the client un-approving a card, clear approvedAt, so a real re-approval still
 * gets through. Any notes the client never pressed Send on ride along in the email.
 */
async function claimApproval(proof: LiveProof, now: Date): Promise<boolean> {
  const claimed = await prisma.proof.updateMany({
    where: { id: proof.id, approvedAt: null },
    data: { approvedAt: now },
  });
  if (claimed.count === 0) return false;

  const open = await prisma.proofComment.count({
    where: { resolvedAt: null, fromClient: true, item: { proofId: proof.id } },
  });
  const { pending, lines } = await unsentNotes(proof.id);
  after(() =>
    notify({
      kind: "proof_approved",
      title: `Proof APPROVED: ${proof.title}`,
      body: open ? `Every card approved, ${open} note(s) still open.` : "Every card approved. Ready to print.",
      url: `/admin/proofs/${proof.id}/`,
      projectId: proof.projectId,
      clientId: proof.project.clientId,
      dedupeKey: `proof_approved:${proof.id}:${now.toISOString()}`,
    })
  );
  const r = await sendMail({
    to: NOTIFY_TO(),
    subject: `Proof APPROVED: ${proof.title}`,
    text: [
      `The client approved every card in "${proof.title}".`,
      open ? `Heads up: ${open} note(s) are still open on it.` : "No open notes.",
      ...(pending.length ? ["", `${pending.length} note(s) they hadn't sent yet:`, ...lines] : []),
      "",
      `Review page: ${publicProofUrl(site.url, proof.token)}`,
    ].join("\n"),
  });
  // Notes count as sent only if that email went out; otherwise Send still works.
  if (pending.length && mailSent(r)) {
    await prisma.proofComment.updateMany({
      where: { id: { in: pending.map((c) => c.id) } },
      data: { notifiedAt: new Date() },
    });
  }
  await prisma.activity.create({
    data: {
      type: "STATUS_CHANGE",
      body: `Client approved the proof "${proof.title}"${open ? ` (${open} note(s) still open)` : ""}.`,
      projectId: proof.projectId,
      clientId: proof.project.clientId,
    },
  });
  // Accepted quote + approved proof = time to pay: the invoice goes up now, so the
  // page refreshes with Pay now on it. A failure here never undoes the approval.
  try {
    if (await ensureInvoiceForProject(proof.projectId)) revalidatePath("/invoice/[token]", "page");
  } catch (e) {
    console.error("[proof] auto invoice failed:", e);
  }
  return true;
}

export async function approveWholeProof(token: string) {
  const proof = await liveProof(token);
  if (!proof) return { ok: false as const, error: "This review link is no longer active." };
  const now = new Date();
  await prisma.proofItem.updateMany({ where: { proofId: proof.id, approvedAt: null }, data: { approvedAt: now } });
  await claimApproval(proof, now);
  revalidatePath(`/proof/${token}`);
  return { ok: true as const };
}
