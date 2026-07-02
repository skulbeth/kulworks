import { addReminder } from "../_actions";

const cls =
  "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";

export default function SetReminder({
  projectId,
  clientId,
}: {
  projectId?: string;
  clientId?: string;
}) {
  return (
    <form action={addReminder} className="flex flex-wrap items-end gap-2">
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <input name="remindAt" type="date" required className={cls} />
      <input
        name="body"
        required
        placeholder="Remind me to…"
        className={`min-w-[10rem] flex-1 ${cls}`}
      />
      <button className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue">
        Set reminder
      </button>
    </form>
  );
}
