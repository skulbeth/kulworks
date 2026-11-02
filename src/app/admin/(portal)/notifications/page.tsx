import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NOTIFY_KINDS, notifyPrefs, type NotifyKind } from "@/lib/notify";
import { vapidKeys } from "@/lib/push";
import EnablePush from "../_components/EnablePush";
import {
  markAllNotificationsRead,
  saveNotifyPrefs,
  sendTestNotification,
  removePushDevice,
} from "../_notify-actions";

export const dynamic = "force-dynamic";

// Shop time, not the server's (Vercel runs in UTC).
const TZ = "America/Chicago";
function when(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 12) return `${Math.round(mins / 60)} hr ago`;
  return d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
const dayKey = (d: Date) => d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" });

const TAG: Partial<Record<NotifyKind, string>> = {
  lead: "bg-blue/15 text-blue",
  quote_accepted: "bg-green-500/15 text-green-600",
  proof_approved: "bg-green-500/15 text-green-600",
  payment: "bg-green-500/15 text-green-600",
  quote_extend: "bg-gold/15 text-gold",
  proof_notes: "bg-gold/15 text-gold",
  message: "bg-gold/15 text-gold",
  email_reply: "bg-gold/15 text-gold",
};
const SHORT: Record<NotifyKind, string> = {
  lead: "Lead",
  doc_viewed: "Opened",
  proof_viewed: "Opened",
  quote_accepted: "Accepted",
  quote_extend: "Extend?",
  address: "Address",
  proof_notes: "Notes",
  proof_approved: "Approved",
  message: "Message",
  email_reply: "Email",
  payment: "Paid",
  upload: "Upload",
  testimonial: "Review",
  system: "System",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tested?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const [items, unread, devices, prefs, keys] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.pushDevice.findMany({ orderBy: { createdAt: "desc" }, include: { profile: { select: { email: true } } } }),
    notifyPrefs(),
    vapidKeys(),
  ]);

  const groups: { day: string; list: typeof items }[] = [];
  for (const n of items) {
    const day = dayKey(n.createdAt);
    const g = groups.at(-1);
    if (g && g.day === day) g.list.push(n);
    else groups.push({ day, list: [n] });
  }

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black">Notifications</h1>
          {unread > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-black">{unread} new</span>
          )}
          {unread > 0 && (
            <form action={markAllNotificationsRead} className="ml-auto">
              <button className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
                Mark all read
              </button>
            </form>
          )}
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-muted">
            Nothing yet. When a client opens a quote, approves proofs, pays or gets in touch, it shows up here and on your phone.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.day}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{g.day}</p>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {g.list.map((n) => {
                    const kind = (n.kind in SHORT ? n.kind : "system") as NotifyKind;
                    return (
                      <li key={n.id}>
                        <Link
                          href={`/admin/notifications/open/${n.id}/`}
                          prefetch={false}
                          className={`flex gap-3 px-4 py-3 hover:bg-surface2 ${n.readAt ? "" : "bg-blue/5"}`}
                        >
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-blue"}`} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG[kind] ?? "bg-surface2 text-muted"}`}>
                                {SHORT[kind]}
                              </span>
                              <span className={`text-sm ${n.readAt ? "font-semibold" : "font-bold"}`}>{n.title}</span>
                            </span>
                            <span className="mt-0.5 block truncate text-sm text-muted">{n.body}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">{when(n.createdAt)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="devices" className="space-y-3">
        <h2 className="text-lg font-bold">Phone alerts</h2>
        <EnablePush vapidPublicKey={keys.publicKey} />
        {devices.length > 0 && (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2 text-sm">
                <span className="font-semibold">{d.label ?? "Device"}</span>
                <span className="text-muted">{d.profile.email}</span>
                <span className="text-xs text-muted">
                  {d.lastPushAt ? `last alert ${when(d.lastPushAt)}` : "no alerts yet"}
                  {d.failCount ? ` · ${d.failCount} failed` : ""}
                </span>
                <form action={removePushDevice} className="ml-auto">
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={sendTestNotification} className="flex flex-wrap items-center gap-3">
          <button className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue">
            Send a test notification
          </button>
          {sp.tested && (
            <span className="text-sm text-muted">
              Sent to {devices.length} device{devices.length === 1 ? "" : "s"}. It should buzz within a few seconds.
            </span>
          )}
        </form>
      </section>

      <section id="settings">
        <h2 className="mb-1 text-lg font-bold">What buzzes your phone</h2>
        <p className="mb-3 text-sm text-muted">Everything still lands in the list above. Unticked kinds just stay quiet.</p>
        <form action={saveNotifyPrefs} className="space-y-2 rounded-xl border border-border bg-surface p-4">
          {(Object.keys(NOTIFY_KINDS) as NotifyKind[]).map((k) => (
            <label key={k} className="flex items-center gap-3 text-sm">
              <input type="checkbox" name={`kind_${k}`} defaultChecked={prefs[k] !== false} className="h-4 w-4 accent-primary" />
              {NOTIFY_KINDS[k].label}
            </label>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary-hover">Save</button>
            {sp.saved && <span className="text-sm text-green-600">Saved.</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
