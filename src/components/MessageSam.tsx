import { sendClientMessage } from "@/app/invoice/[token]/actions";
import SubmitButton from "@/components/SubmitButton";

// A plain "ask Sam something" box for the client's quote/invoice and proof pages.
// It posts to a server action and comes back with ?msg=sent|slow|empty.
export default function MessageSam({
  kind,
  token,
  status,
}: {
  kind: "invoice" | "proof";
  token: string;
  status?: string;
}) {
  return (
    <form id="message" action={sendClientMessage} className="mt-6 border-t border-border pt-5 print:hidden">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="token" value={token} />
      <p className="font-bold">Questions? Message Sam</p>
      <p className="mb-2 text-sm text-muted">It goes straight to my phone. I&apos;ll answer by email.</p>
      {status === "sent" ? (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-600">
          Sent! I&apos;ll get back to you soon.
        </p>
      ) : (
        <>
          <textarea
            name="message"
            rows={3}
            maxLength={2000}
            required
            placeholder="Ask about timing, changes, shipping..."
            className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          {status === "slow" && <p className="mt-1 text-sm text-red-600">That&apos;s a lot of messages at once. Try again in a bit.</p>}
          {status === "empty" && <p className="mt-1 text-sm text-red-600">Type a message first.</p>}
          <SubmitButton
            pendingText="Sending..."
            className="min-h-11 mt-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover"
          >
            Send message
          </SubmitButton>
        </>
      )}
    </form>
  );
}
