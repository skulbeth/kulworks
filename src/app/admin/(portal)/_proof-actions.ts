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
import { newProofToken, proofImagePath, proofUploadSlot, PROOF_SIZES, PROOF_PREFIX } from "@/lib/proofs";

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

export type UploadEntry = { key: string; side: "front" | "back" };

export async function prepareProofUploads(proofId: string, entries: UploadEntry[]) {
  await requireProfile();
  const proof = await prisma.proof.findUnique({ where: { id: proofId } });
  if (!proof || !Array.isArray(entries) || entries.length > 50) return [];
  const slots = [];
  for (const e of entries) {
    if (typeof e?.key !== "string" || !e.key || (e.side !== "front" && e.side !== "back")) continue;
    const slot = await proofUploadSlot(proofImagePath(proof.id, e.key, e.side));
    if (slot) slots.push({ key: e.key, side: e.side, path: slot.path, token: slot.token });
  }
  return slots;
}

export type UploadedEntry = UploadEntry & { path: string; position: number };

export async function registerProofImages(proofId: string, entries: UploadedEntry[]) {
  await requireProfile();
  const proof = await prisma.proof.findUnique({ where: { id: proofId } });
  if (!proof || !Array.isArray(entries)) return { ok: false };
  const stale: string[] = [];
  for (const e of entries) {
    if (typeof e?.path !== "string" || !e.path.startsWith(`${PROOF_PREFIX}/${proof.id}/`)) continue;
    const field = e.side === "back" ? "backPath" : "frontPath";
    const existing = await prisma.proofItem.findUnique({ where: { proofId_key: { proofId, key: e.key } } });
    if (existing?.[field]) stale.push(existing[field]!);
    await prisma.proofItem.upsert({
      where: { proofId_key: { proofId, key: e.key } },
      create: { proofId, key: e.key, position: Number(e.position) || 0, [field]: e.path },
      // A replaced image is a new version: the old approval no longer applies to it.
      update: { position: Number(e.position) || 0, [field]: e.path, approvedAt: null },
    });
  }
  if (stale.length) await removeUploadFiles(stale);
  if (proof.approvedAt) await prisma.proof.update({ where: { id: proof.id }, data: { approvedAt: null } });
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
