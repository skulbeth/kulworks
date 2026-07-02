// A small form to log an activity/note against a project or client.
import { addActivity } from "../_actions";

const TYPES = [
  { value: "NOTE", label: "Note" },
  { value: "EMAIL_SENT", label: "Email sent" },
  { value: "EMAIL_RECEIVED", label: "Email received" },
  { value: "CALL", label: "Call" },
  { value: "MEETING", label: "Meeting" },
  { value: "STATUS_CHANGE", label: "Status change" },
  { value: "PAYMENT", label: "Payment" },
  { value: "REMINDER", label: "Reminder" },
];

export default function AddActivity({
  projectId,
  clientId,
}: {
  projectId?: string;
  clientId?: string;
}) {
  return (
    <form action={addActivity} className="flex flex-wrap items-end gap-2">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <select
        name="type"
        defaultValue="NOTE"
        className="rounded-lg border border-border bg-surface2 px-3 py-2 text-sm"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        name="body"
        required
        placeholder="Add a note…"
        className="min-w-[12rem] flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
      />
      <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary-hover">
        Log
      </button>
    </form>
  );
}
