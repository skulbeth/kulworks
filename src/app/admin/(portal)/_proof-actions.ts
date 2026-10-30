"use server";

// Proof actions, kept out of _actions.ts like the testimonial ones: it's past 1500
// lines and this is a self-contained feature.
//
// Upload is two calls around the browser: prepareProofUploads hands out one-time
// storage slots, the admin page shrinks + watermarks each card and writes it
// straight to storage, then registerProofImages records what landed. The print
// files themselves never reach the server.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";
import { removeUploadFiles } from "@/lib/uploads";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import {
  newProofToken,
  proofImagePath,
  proofUploadSlot,
  publicProofUrl,
  isProofItemUpdated,
  PROOF_SIZES,
  PROOF_PREFIX,
} from "@/lib/proofs";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

function refresh(proofId?: string, projectId?: string) {
  if (proofId) revalidatePath(`/admin/proofs/${proofId}`);
  if (projectId) revalidatePath(`/admin/projects/${projectId}`);
}

export async function createProof(formData: FormData) {
  const { profile } = await requireProfile();
  const projectId = s(formData, "projectId");
  if (!projectId) return;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) redirect("/admin/projects/");

  const size = PROOF_SIZES.find((z) => z.id === s(formData, "size")) ?? PROOF_SIZES[0];
  const w = Number(s(formData, "widthIn"));
  const h = Number(s(formData, "heightIn"));
  const custom = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && w <= 48 && h <= 48;

  const proof = await prisma.proof.create({
    data: {
      token: newProofToken(),
      projectId,
      title: s(formData, "title")?.slice(0, 120) || project.title,
      widthIn: custom ? w : size.widthIn,
      heightIn: custom ? h : size.heightIn,
    },
  });
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `Proof page created: "${proof.title}" (${proof.widthIn} x ${proof.heightIn} in).`,
      projectId,
      clientId: project.clientId,
      authorId: profile.id,
    },
  });
  refresh(undefined, projectId);
  redirect(`/admin/proofs/${proof.id}/`);
}

export type UploadEntry = { key: string; side: "front" | "back"; hash?: string };

/**
 * Upload slots for the cards that changed. A file whose fingerprint matches what's
 * already up is left out of `slots` and listed in `same`, so dropping a whole export
 * back in only replaces the real edits (and only those lose their approval).
 */
export async function prepareProofUploads(proofId: string, entries: UploadEntry[]) {
  await requireProfile();
  const out = {
    slots: [] as { key: string; side: "front" | "back"; path: string; token: string }[],
    same: [] as UploadEntry[],
  };
  const proof = await prisma.proof.findUnique({ where: { id: proofId } });
  if (!proof || !Array.isArray(entries) || entries.length > 50) return out;
  const existing = await prisma.proofItem.findMany({
    where: { proofId, key: { in: entries.map((e) => String(e?.key)) } },
  });
  for (const e of entries) {
    if (typeof e?.key !== "string" || !e.key || (e.side !== "front" && e.side !== "back")) continue;
    const have = existing.find((i) => i.key === e.key);
    const [path, hash] = e.side === "back" ? [have?.backPath, have?.backHash] : [have?.frontPath, have?.frontHash];
    if (path && hash && typeof e.hash === "string" && hash === e.hash) {
      out.same.push({ key: e.key, side: e.side });
      continue;
    }
    const slot = await proofUploadSlot(proofImagePath(proof.id, e.key, e.side));
    if (slot) out.slots.push({ key: e.key, side: e.side, path: slot.path, token: slot.token });
  }
  return out;
}

export type UploadedEntry = UploadEntry & { path: string; position: number };

export async function registerProofImages(proofId: string, entries: UploadedEntry[]) {
  await requireProfile();
  const proof = await prisma.proof.findUnique({ where: { id: proofId } });
  if (!proof || !Array.isArray(entries)) return { ok: false };
  // Once the client has started reviewing (or been sent the link), anything new or
  // replaced is tagged "Updated" for them. The first upload of a fresh proof isn't.
  const reviewing =
    !!proof.clientNotifiedAt ||
    (await prisma.proofItem.count({ where: { proofId, approvedAt: { not: null } } })) > 0 ||
    (await prisma.proofComment.count({ where: { fromClient: true, item: { proofId } } })) > 0;
  const now = new Date();
  const stale: string[] = [];
  for (const e of entries) {
    if (typeof e?.path !== "string" || !e.path.startsWith(`${PROOF_PREFIX}/${proof.id}/`)) continue;
    const [field, hashField] =
      e.side === "back" ? (["backPath", "backHash"] as const) : (["frontPath", "frontHash"] as const);
    const hash = typeof e.hash === "string" ? e.hash.slice(0, 128) : null;
    const existing = await prisma.proofItem.findUnique({ where: { proofId_key: { proofId, key: e.key } } });
    if (existing?.[field]) stale.push(existing[field]!);
    await prisma.proofItem.upsert({
      where: { proofId_key: { proofId, key: e.key } },
      create: {
        proofId,
        key: e.key,
        position: Number(e.position) || 0,
        [field]: e.path,
        [hashField]: hash,
        replacedAt: reviewing ? now : null,
      },
      // A replaced image is a new version: the old approval no longer applies to it.
      update: {
        position: Number(e.position) || 0,
        [field]: e.path,
        [hashField]: hash,
        approvedAt: null,
        ...(reviewing || existing?.replacedAt ? { replacedAt: now } : {}),
      },
    });
  }
  if (stale.length) await removeUploadFiles(stale);
  if (proof.approvedAt && entries.length) await prisma.proof.update({ where: { id: proof.id }, data: { approvedAt: null } });
  refresh(proof.id, proof.projectId);
  return { ok: true };
}

export async function setProofActive(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const proof = await prisma.proof.update({ where: { id }, data: { active: s(formData, "active") === "true" } });
  refresh(proof.id, proof.projectId);
}

export async function deleteProofItem(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const item = await prisma.proofItem.findUnique({ where: { id }, include: { proof: true } });
  if (!item) return;
  await prisma.proofItem.delete({ where: { id } });
  await removeUploadFiles([item.frontPath, item.backPath].filter((p): p is string => !!p));
  refresh(item.proofId, item.proof.projectId);
}

/** Deletes the proof and its stored previews. The project and its notes in Activity stay. */
export async function deleteProof(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const proof = await prisma.proof.findUnique({ where: { id }, include: { items: true } });
  if (!proof) return;
  const paths = proof.items.flatMap((i) => [i.frontPath, i.backPath]).filter((p): p is string => !!p);
  await prisma.proof.delete({ where: { id } });
  await removeUploadFiles(paths);
  refresh(undefined, proof.projectId);
  redirect(`/admin/projects/${proof.projectId}/`);
}

/** Marks a client note done, optionally with a reply the client sees under it. */
export async function resolveProofComment(formData: FormData) {
  await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const c = await prisma.proofComment.findUnique({ where: { id }, include: { item: { include: { proof: true } } } });
  if (!c) return;
  const reopen = s(formData, "reopen") === "true";
  await prisma.proofComment.update({ where: { id }, data: { resolvedAt: reopen ? null : new Date() } });
  const reply = s(formData, "reply")?.slice(0, 2000);
  if (reply && !reopen) {
    await prisma.proofComment.create({
      data: { itemId: c.itemId, side: c.side, body: reply, fromClient: false, notifiedAt: new Date() },
    });
  }
  refresh(c.item.proofId, c.item.proof.projectId);
  revalidatePath(`/proof/${c.item.proof.token}`);
}

/**
 * Emails the client their proof link. With updated cards it lists them ("Card 3,
 * Card 27"), numbered the way the client's page counts them; otherwise it's the
 * first "your proof is ready" note. Replies go to Sam's inbox.
 */
export async function notifyProofClient(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const proof = await prisma.proof.findUnique({
    where: { id },
    include: {
      project: { include: { client: true } },
      items: {
        orderBy: [{ position: "asc" }, { key: "asc" }],
        include: { comments: { select: { fromClient: true, createdAt: true } } },
      },
    },
  });
  if (!proof || !proof.active || !proof.project.client.email) return;

  const shown = proof.items.filter((i) => i.frontPath || i.backPath);
  const updated = shown.map((i, n) => ({ i, n: n + 1 })).filter(({ i }) => isProofItemUpdated(i));
  const first = proof.project.client.name.trim().split(/\s+/)[0] || "there";
  const url = publicProofUrl(site.url, proof.token);
  const many = updated.length === 1 ? "" : "s";
  const text = [
    `Hi ${first},`,
    "",
    updated.length
      ? `I've updated ${updated.length} card${many} on "${proof.title}": ${updated.map((u) => `Card ${u.n}`).join(", ")}.`
      : `Your card proof for "${proof.title}" is ready to review.`,
    "",
    updated.length === 1
      ? `It's marked Updated on the page, and "Show only updated" takes you straight to it. Leave a note if it still needs a change, or approve it if it looks right.`
      : updated.length
      ? `They're marked Updated on the page, and "Show only updated" takes you straight to them. Leave a note on anything that still needs a change, or approve them if they look right.`
      : `Click any card to see it up close. To ask for a change, click the spot on the card and write what it should say, then press Send my notes. When everything looks right, press Approve all.`,
    "",
    url,
    "",
    "Thanks,",
    "Sam",
    "Kulworks",
  ].join("\n");

  const r = await sendMail({
    to: proof.project.client.email,
    subject: updated.length ? `Updated card${many} ready: ${proof.title}` : `Your card proof is ready: ${proof.title}`,
    text,
    replyTo: process.env.QUOTE_NOTIFY_EMAIL || "kulworksdesign@gmail.com",
  });
  if ("error" in r && r.error) return;
  await prisma.proof.update({ where: { id: proof.id }, data: { clientNotifiedAt: new Date() } });
  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: updated.length
        ? `Emailed the client that ${updated.length} card${many} on "${proof.title}" ${updated.length === 1 ? "was" : "were"} updated (${updated.map((u) => u.n).join(", ")}).`
        : `Emailed the client the proof link for "${proof.title}".`,
      projectId: proof.projectId,
      clientId: proof.project.clientId,
      authorId: profile.id,
    },
  });
  refresh(proof.id, proof.projectId);
}
