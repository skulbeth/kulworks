// Shows the outcome of a server action that redirected back with ?done= or ?error=.
//
// The actions have always redirected with these codes, but most pages never read
// them, so a refused action (a balance already raised, a doc that is no longer a
// draft) looked exactly like a click that did nothing.
import Link from "next/link";

const DONE: Record<string, string> = {
  "doc-created": "Document created.",
  "doc-updated": "Changes saved.",
  "doc-sent": "Sent to the client.",
  "doc-paid": "Marked paid, and a payment was recorded on the project.",
  "doc-void": "Voided.",
  "doc-converted": "Quote converted to an invoice.",
  "balance-created": "Balance invoice raised. It starts as a draft, so look it over before sending.",
  "quote-started": "Project created and a draft quote started.",
  created: "Created.",
  updated: "Saved.",
};

const ERROR: Record<string, string> = {
  noitems: "Add at least one line item first. A line needs a description to count.",
  "not-draft": "That document has already gone out, so its numbers are locked. Void it and raise a new one instead.",
  "no-balance": "There is no balance to invoice. That document has no deposit set, or the deposit is the whole amount.",
  "balance-exists": "A balance invoice for that document already exists. Raising another would bill the client twice.",
  missing: "Something required was left blank.",
  notfound: "That record no longer exists.",
};

export default function ResultBanner({
  done,
  error,
  basePath,
}: {
  done?: string;
  error?: string;
  /** Where the dismiss link goes, i.e. this page without the query string. */
  basePath: string;
}) {
  const msg = error ? ERROR[error] : done ? DONE[done] : null;
  if (!msg) return null;
  const bad = !!error;

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        bad
          ? "border-red-500/40 bg-red-500/10 text-red-700"
          : "border-green-500/40 bg-green-500/10 text-green-700"
      }`}
    >
      <span className="font-semibold">{bad ? "Not done:" : "Done:"}</span>
      <span className="flex-1">{msg}</span>
      <Link href={basePath} className="shrink-0 font-semibold underline">
        Dismiss
      </Link>
    </div>
  );
}
