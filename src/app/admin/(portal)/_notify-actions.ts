"use server";

// Notifications inbox + phone push settings.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/auth";
import { notify, setNotifyPrefs, NOTIFY_KINDS } from "@/lib/notify";

export async function markAllNotificationsRead() {
  await requireProfile();
  await prisma.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin", "layout");
}

export async function saveNotifyPrefs(formData: FormData) {
  await requireProfile();
  const prefs: Record<string, boolean> = {};
  for (const k of Object.keys(NOTIFY_KINDS)) prefs[k] = formData.get(`kind_${k}`) === "on";
  await setNotifyPrefs(prefs);
  revalidatePath("/admin/notifications");
  redirect("/admin/notifications/?saved=1#settings");
}

export async function sendTestNotification() {
  const { profile } = await requireProfile();
  await notify({
    kind: "system",
    title: "Kulworks test notification",
    body: `If you can read this on your phone, alerts are working. (${profile.email})`,
    url: "/admin/notifications/",
  });
  revalidatePath("/admin", "layout");
  redirect("/admin/notifications/?tested=1#devices");
}

export async function removePushDevice(formData: FormData) {
  await requireProfile();
  const id = formData.get("id");
  if (typeof id === "string") await prisma.pushDevice.deleteMany({ where: { id } });
  revalidatePath("/admin/notifications");
}
