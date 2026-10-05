"use server";

// Testimonial actions, kept out of _actions.ts because that file is already past
// 1500 lines and this is a self-contained feature.
//
// Publishing is the one gate that matters. A testimonial is someone else's words,
// and putting them on the site is an endorsement, so nothing goes public without
// recorded permission. `consent` is enforced here AND in the public query, so a row
// cannot slip out through a direct status write.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { site } from "@/data/site";
import {
  newToken,
  publicTestimonialUrl,
  putTestimonialImage,
  TESTIMONIAL_PREFIX,
  MAX_IMAGE_BYTES,
  IMAGE_TYPES,
} from "@/lib/testimonials";
import { removeUploadFiles } from "@/lib/uploads";

/** A testimonial carries two pictures, kept apart by the path suffix:
 *  the message screenshot ("") and a photo of the item it is about ("-item"). */
type Kind = "" | "-item";

function pickFile(fd: FormData, field: string): File | null {
  const f = fd.get(field);
  return f instanceof File && f.size > 0 ? f : null;
}

/** Null when fine, otherwise the error code to redirect with. */
function imageProblem(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return "image_too_big";
  if (!IMAGE_TYPES.includes(file.type)) return "image_type";
  return null;
}

/** Stores the upload and returns its path, or null if the upload failed. */
async function storeImage(file: File, id: string, kind: Kind): Promise<string | null> {
  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${TESTIMONIAL_PREFIX}/${id}${kind}.${ext}`;
  const ok = await putTestimonialImage(path, Buffer.from(await file.arrayBuffer()), file.type);
  return ok ? path : null;
}

const SITE_URL = "https://kulworks.com";
const LIST = "/admin/testimonials/";

function s(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}

async function logAudit(actorEmail: string, action: string, detail?: string) {
  try {
    await prisma.auditLog.create({ data: { actorEmail, action, detail: detail ?? null } });
  } catch {
    /* best effort */
  }
}

function revalidateAll() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "page");
  revalidatePath("/testimonials");
}

/** Sends a client their own private link and leaves a PENDING row waiting for it. */
export async function requestTestimonial(formData: FormData) {
  const { profile } = await requireProfile();
  const clientId = s(formData, "clientId");
  if (!clientId) return;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;

  // One open request per client, so a second click re-sends the same link rather
  // than leaving a trail of live tokens behind.
  const open = await prisma.testimonial.findFirst({
    where: { clientId, submittedAt: null, deletedAt: null, token: { not: null } },
  });

  const row =
    open ??
    (await prisma.testimonial.create({
      data: {
        name: client.name,
        clientId,
        source: "REQUESTED",
        status: "PENDING",
        token: newToken(),
        requestedAt: new Date(),
      },
    }));

  if (open) {
    await prisma.testimonial.update({ where: { id: open.id }, data: { requestedAt: new Date() } });
  }

  const link = publicTestimonialUrl(SITE_URL, row.token as string);
  const first = client.name.split(" ")[0];

  await sendMail({
    to: client.email,
    replyTo: site.email,
    subject: "Would you mind saying a few words?",
    text: [
      "Hi " + first + ",",
      "",
      "Thanks again for letting us make something for you. If you have a minute, would you",
      "mind writing a line or two about how it went? It helps the next person decide whether",
      "to trust us with their project.",
      "",
      "Here is your link:",
      link,
      "",
      "Nothing goes on the site unless you tick the permission box, you choose what name is",
      "shown, and you can ask us to take it down at any time.",
      "",
      "No worries at all if you would rather not.",
      "",
      "Sam",
      "Kulworks",
    ].join("\n"),
  });

  await prisma.activity.create({
    data: {
      type: "EMAIL_SENT",
      body: "Asked for a testimonial.",
      clientId,
      authorId: profile.id,
    },
  });

  await logAudit(profile.email, "testimonial.request", clientId + " -> " + row.id);
  revalidateAll();
  redirect("/admin/clients/" + clientId + "/?done=testimonial_requested");
}

/** A quote Sam already has: typed in, or a screenshot of a text or email. */
export async function addTestimonial(formData: FormData) {
  const { profile } = await requireProfile();

  const name = s(formData, "name");
  const quote = s(formData, "quote");
  const detail = s(formData, "detail");
  const consentNote = s(formData, "consentNote");
  const consent = formData.get("consent") === "on";
  const shot = pickFile(formData, "image");
  const photo = pickFile(formData, "photo");

  if (!name) redirect(LIST + "?error=name_required");
  if (!quote && !shot) redirect(LIST + "?error=empty");
  for (const f of [shot, photo]) {
    const problem = f && imageProblem(f);
    if (problem) redirect(LIST + "?error=" + problem);
  }

  const row = await prisma.testimonial.create({
    data: { name: name as string, quote, detail, consent, consentNote, source: "ADDED", status: "PENDING" },
  });

  const imagePath = shot ? await storeImage(shot, row.id, "") : null;
  const photoPath = photo ? await storeImage(photo, row.id, "-item") : null;
  if (imagePath || photoPath) {
    await prisma.testimonial.update({
      where: { id: row.id },
      data: { ...(imagePath ? { imagePath } : {}), ...(photoPath ? { photoPath } : {}) },
    });
  }

  await logAudit(profile.email, "testimonial.add", row.id);
  revalidateAll();
  redirect(LIST + "?done=testimonial_added");
}

export async function updateTestimonial(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const current = await prisma.testimonial.findUnique({ where: { id } });
  if (!current) return;
  const consent = formData.get("consent") === "on";

  // Pictures can be added, swapped or taken off an existing testimonial. This is
  // how an item photo gets onto one that was added before there was a field for it.
  const shot = pickFile(formData, "image");
  const photo = pickFile(formData, "photo");
  for (const f of [shot, photo]) {
    const problem = f && imageProblem(f);
    if (problem) redirect(LIST + "?error=" + problem);
  }
  const dropShot = formData.get("removeImage") === "on";
  const dropPhoto = formData.get("removePhoto") === "on";

  const pictures: { imagePath?: string | null; photoPath?: string | null } = {};
  const orphaned: string[] = [];

  if (dropShot && current.imagePath) {
    orphaned.push(current.imagePath);
    pictures.imagePath = null;
  } else if (shot) {
    const path = await storeImage(shot, id, "");
    if (path) {
      // A different file type means a different path, so the old one would linger.
      if (current.imagePath && current.imagePath !== path) orphaned.push(current.imagePath);
      pictures.imagePath = path;
    }
  }

  if (dropPhoto && current.photoPath) {
    orphaned.push(current.photoPath);
    pictures.photoPath = null;
  } else if (photo) {
    const path = await storeImage(photo, id, "-item");
    if (path) {
      if (current.photoPath && current.photoPath !== path) orphaned.push(current.photoPath);
      pictures.photoPath = path;
    }
  }

  if (orphaned.length) await removeUploadFiles(orphaned);

  await prisma.testimonial.update({
    where: { id },
    data: {
      name: s(formData, "name") ?? current.name,
      quote: s(formData, "quote"),
      detail: s(formData, "detail"),
      consentNote: s(formData, "consentNote"),
      consent,
      ...pictures,
      // Withdrawing permission takes it straight back off the site.
      ...(current.status === "PUBLISHED" && !consent
        ? { status: "PENDING" as const, publishedAt: null, featured: false }
        : {}),
    },
  });

  await logAudit(profile.email, "testimonial.update", id);
  revalidateAll();
  redirect(LIST + "?done=testimonial_saved");
}

export async function publishTestimonial(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;

  const t = await prisma.testimonial.findUnique({ where: { id } });
  if (!t || t.deletedAt) return;
  if (!t.consent) redirect(LIST + "?error=no_consent");
  if (!t.quote && !t.imagePath) redirect(LIST + "?error=empty");

  await prisma.testimonial.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: t.publishedAt ?? new Date() },
  });

  await logAudit(profile.email, "testimonial.publish", id);
  revalidateAll();
  redirect(LIST + "?done=testimonial_published");
}

export async function unpublishTestimonial(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.testimonial.update({
    where: { id },
    data: { status: "PENDING", publishedAt: null, featured: false },
  });
  await logAudit(profile.email, "testimonial.unpublish", id);
  revalidateAll();
  redirect(LIST + "?done=testimonial_unpublished");
}

/** Pin to the three-up strip on the home page. */
export async function toggleTestimonialFeatured(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  const t = await prisma.testimonial.findUnique({ where: { id } });
  if (!t || t.status !== "PUBLISHED") return;
  await prisma.testimonial.update({ where: { id }, data: { featured: !t.featured } });
  await logAudit(profile.email, "testimonial.featured", id + " -> " + String(!t.featured));
  revalidateAll();
  redirect(LIST + "?done=testimonial_saved");
}

/** Soft delete. The row and its screenshot stay; it just stops being anywhere public. */
export async function archiveTestimonial(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.testimonial.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED", featured: false, publishedAt: null },
  });
  await logAudit(profile.email, "testimonial.archive", id);
  revalidateAll();
  redirect(LIST + "?done=testimonial_archived");
}

export async function restoreTestimonial(formData: FormData) {
  const { profile } = await requireProfile();
  const id = s(formData, "id");
  if (!id) return;
  await prisma.testimonial.update({
    where: { id },
    data: { deletedAt: null, status: "PENDING" },
  });
  await logAudit(profile.email, "testimonial.restore", id);
  revalidateAll();
  redirect(LIST + "?done=testimonial_restored");
}
