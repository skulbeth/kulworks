"use server";

// Public actions for the client-facing quote/invoice page.
//
// These are reachable without a login, so the unguessable invoice token IS the
// credential: the same thing that lets someone read the document lets them fill
// in the shipping address on it. Nothing here exposes anything a holder of the
// link cannot already see, and nothing here touches money or status.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function clean(fd: FormData, k: string, max = 120): string | null {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim().slice(0, max) : "";
  return t === "" ? null : t;
}

export async function saveClientAddress(formData: FormData) {
  const token = clean(formData, "token", 200);
  if (!token) return;

  const inv = await prisma.invoice.findUnique({
    where: { token },
    select: { id: true, clientId: true, deletedAt: true, projectId: true, number: true },
  });
  if (!inv || inv.deletedAt) return;

  const street = clean(formData, "street");
  const city = clean(formData, "city");
  const state = clean(formData, "state", 60);
  const postalCode = clean(formData, "postalCode", 20);
  const country = clean(formData, "country", 60);
  const phone = clean(formData, "phone", 40);

  // An all-empty submit is a no-op rather than a way to wipe an address.
  if (!street && !city && !state && !postalCode && !country && !phone) return;

  await prisma.client.update({
    where: { id: inv.clientId },
    data: {
      ...(street ? { street } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(country ? { country } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  const parts = [street, city, state, postalCode, country].filter(Boolean).join(", ");
  await prisma.activity.create({
    data: {
      type: "NOTE",
      body: `Client filled in their details from ${inv.number}: ${parts}${phone ? ` · ${phone}` : ""}`,
      clientId: inv.clientId,
      projectId: inv.projectId,
    },
  });

  revalidatePath(`/invoice/${token}`);
  revalidatePath("/admin", "layout");
}
