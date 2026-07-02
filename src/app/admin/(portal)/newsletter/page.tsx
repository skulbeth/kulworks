import { prisma } from "@/lib/prisma";
import { sendBroadcast } from "../_actions";
import ConfirmButton from "../_components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const activeCount = await prisma.subscriber.count({ where: { unsubscribedAt: null } });
  const configured = !!process.env.RESEND_AUDIENCE_ID;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="text-muted">
          Compose and send to your{" "}
          <span className="font-semibold text-foreground">{activeCount}</span> subscriber
          {activeCount === 1 ? "" : "s"}. Resend adds an unsubscribe link automatically.
        </p>
      </div>

      {sent && (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-600">
          Sent! Your newsletter is on its way to {activeCount} subscriber
          {activeCount === 1 ? "" : "s"}.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          Couldn&apos;t send — check that a subject and message are filled in.
        </p>
      )}

      <form action={sendBroadcast} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Subject
          </span>
          <input
            name="subject"
            required
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Message
          </span>
          <textarea
            name="body"
            required
            rows={12}
            placeholder="Write your update… (blank lines start new paragraphs)"
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-3">
          <ConfirmButton
            disabled={!configured || activeCount === 0}
            message={`Send this newsletter to ${activeCount} subscriber${activeCount === 1 ? "" : "s"} right now? This can't be undone.`}
            className="rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover disabled:opacity-50"
          >
            Send to {activeCount} subscriber{activeCount === 1 ? "" : "s"}
          </ConfirmButton>
          {(!configured || activeCount === 0) && (
            <span className="text-sm text-muted">
              {activeCount === 0 ? "No subscribers yet." : "Audience not configured."}
            </span>
          )}
        </div>
      </form>

      <p className="text-xs text-muted">
        Note: marketing emails legally need a physical mailing address in the footer
        (a PO box is fine). Add yours in site data before sending real campaigns.
      </p>
    </div>
  );
}
