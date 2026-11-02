// The one way the site tells Sam something happened.
//
// notify() writes a Notification row (the app's inbox) and pushes it to every
// registered device. It never throws: a client pressing "Approve" must not see an
// error because a phone was offline. Kinds can be switched off per kind from
// /admin/notifications; a switched-off kind still lands in the inbox, it just
// doesn't buzz the phone.
import { prisma } from "@/lib/prisma";
import { pushToAll } from "@/lib/push";

export const NOTIFY_KINDS = {
  lead: { label: "New quote requests and orders", urgent: true },
  doc_viewed: { label: "Client opened a quote or invoice", urgent: false },
  proof_viewed: { label: "Client opened their proofs", urgent: false },
  quote_accepted: { label: "Client accepted a quote", urgent: true },
  quote_extend: { label: "Client asked to extend an expired quote", urgent: true },
  address: { label: "Client saved their shipping details", urgent: false },
  proof_notes: { label: "Client sent proof notes", urgent: true },
  proof_approved: { label: "Client approved their proofs", urgent: true },
  message: { label: "Client sent a message from their page", urgent: true },
  email_reply: { label: "Client emailed", urgent: true },
  payment: { label: "Payment received (detected from a receipt email)", urgent: true },
  upload: { label: "Client uploaded files", urgent: false },
  testimonial: { label: "New testimonial", urgent: false },
  system: { label: "Test and system messages", urgent: false },
} as const;

export type NotifyKind = keyof typeof NOTIFY_KINDS;

const PREFS_KEY = "notify_prefs";

/** Kinds Sam has muted on the phone ({ kind: false }). Missing = on. */
export async function notifyPrefs(): Promise<Record<string, boolean>> {
  const row = await prisma.setting.findUnique({ where: { key: PREFS_KEY } });
  try {
    return row ? (JSON.parse(row.value) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export async function setNotifyPrefs(prefs: Record<string, boolean>) {
  const value = JSON.stringify(prefs);
  await prisma.setting.upsert({ where: { key: PREFS_KEY }, update: { value }, create: { key: PREFS_KEY, value } });
}

export async function notify(n: {
  kind: NotifyKind;
  title: string;
  body: string;
  url?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  /** Same key twice = notify once (refreshes, retried sweeps). */
  dedupeKey?: string;
}): Promise<void> {
  try {
    let row;
    try {
      row = await prisma.notification.create({
        data: {
          kind: n.kind,
          title: n.title.slice(0, 200),
          body: n.body.slice(0, 1000),
          url: n.url ?? null,
          projectId: n.projectId ?? null,
          clientId: n.clientId ?? null,
          dedupeKey: n.dedupeKey ?? null,
        },
      });
    } catch (e) {
      // Unique dedupeKey: this exact event was already announced.
      if ((e as { code?: string }).code === "P2002") return;
      throw e;
    }

    const prefs = await notifyPrefs();
    if (prefs[n.kind] === false) return;

    const pushed = await pushToAll({
      title: n.title,
      body: n.body,
      url: n.url ?? "/admin/notifications/",
      tag: n.dedupeKey ?? row.id,
      id: row.id,
      urgent: NOTIFY_KINDS[n.kind].urgent,
    });
    if (pushed) await prisma.notification.update({ where: { id: row.id }, data: { pushed } });
  } catch (e) {
    console.error("[notify] failed", n.kind, e);
  }
}

/** Admin link for a project, the usual tap target. */
export const projectUrl = (projectId: string) => `/admin/projects/${projectId}/`;
