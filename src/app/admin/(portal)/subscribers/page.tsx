import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/format";
import { addSubscriberManual } from "../_actions";
import RecordExplorer, {
  type ExplorerColumn,
  type ExplorerItem,
} from "../_components/RecordExplorer";

export const dynamic = "force-dynamic";

const columns: ExplorerColumn[] = [
  { key: "email", label: "Email" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "since", label: "Subscribed" },
];

const ADD_FIELD =
  "rounded-lg border border-border bg-surface2 px-3 py-2.5 text-base focus:border-blue focus:outline-none";

export default async function SubscribersPage() {
  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
  });

  const items: ExplorerItem[] = subscribers.map((s) => {
    const active = !s.unsubscribedAt;
    return {
      id: s.id,
      title: s.email,
      subtitle: s.source ?? undefined,
      badge: active ? "Subscribed" : "Unsubscribed",
      badgeTone: active ? "green" : "red",
      search: [s.email, s.source].filter(Boolean).join(" ").toLowerCase(),
      cells: {
        email: s.email,
        source: s.source ?? "—",
        status: active ? "Subscribed" : "Unsubscribed",
        since: fmtDate(s.createdAt),
      },
      detail: (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase text-muted">Email</span>
            <div>{s.email}</div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-muted">Source</span>
            <div>{s.source ?? "—"}</div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-muted">Subscribed</span>
            <div>{fmtDate(s.createdAt)}</div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-muted">Status</span>
            <div>{active ? "Subscribed" : `Unsubscribed ${fmtDate(s.unsubscribedAt)}`}</div>
          </div>
        </div>
      ),
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Subscribers</h1>
      <p className="mb-6 text-muted">
        Newsletter sign-ups. You own this list; sending happens from Resend (coming soon).
      </p>
      <details className="mb-6 rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer select-none font-semibold text-blue">+ Add a subscriber</summary>
        <form action={addSubscriberManual} className="mt-4 flex flex-wrap items-center gap-3">
          <input name="email" type="email" required placeholder="Email" className={`${ADD_FIELD} min-w-0 flex-1`} />
          <button className="rounded-full bg-primary px-5 py-2.5 font-bold text-black hover:bg-primary-hover">
            Add subscriber
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">Also added to your Resend audience so they can receive newsletters.</p>
      </details>

      <RecordExplorer columns={columns} items={items} filename="kulworks-subscribers" />
    </div>
  );
}
