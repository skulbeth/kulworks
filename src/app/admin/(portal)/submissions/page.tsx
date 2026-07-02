import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDateTime, fmtText } from "@/lib/format";
import {
  updateSubmissionStatus,
  convertSubmissionToProject,
  deleteSubmission,
} from "../_actions";
import RecordExplorer, {
  type ExplorerColumn,
  type ExplorerItem,
} from "../_components/RecordExplorer";
import ConfirmButton from "../_components/ConfirmButton";

export const dynamic = "force-dynamic";

const SUBMISSION_STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];

const columns: ExplorerColumn[] = [
  { key: "created", label: "Received" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "type", label: "Requested" },
  { key: "status", label: "Status" },
];

const statusTone: Record<string, ExplorerItem["badgeTone"]> = {
  NEW: "blue",
  CONTACTED: "gold",
  QUOTED: "gold",
  WON: "green",
  LOST: "red",
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const { open } = await searchParams;
  const submissions = await prisma.submission.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  // Correlate each submitter's anonymous session with the pages they viewed.
  const sessionIds = [
    ...new Set(submissions.map((s) => s.sessionId).filter(Boolean)),
  ] as string[];
  const journeys = new Map<string, string[]>();
  if (sessionIds.length) {
    const views = await prisma.pageView.findMany({
      where: { sessionId: { in: sessionIds } },
      orderBy: { createdAt: "asc" },
      select: { sessionId: true, path: true },
    });
    for (const v of views) {
      if (!v.sessionId) continue;
      const arr = journeys.get(v.sessionId) ?? [];
      arr.push(v.path);
      journeys.set(v.sessionId, arr);
    }
  }

  const items: ExplorerItem[] = submissions.map((s) => ({
    id: s.id,
    title: s.name,
    subtitle: `${s.email}${s.projectType ? ` · ${s.projectType}` : ""}`,
    badge: s.status,
    badgeTone: statusTone[s.status] ?? "neutral",
    search: [s.name, s.email, s.projectType, s.message, s.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    cells: {
      created: fmtDateTime(s.createdAt),
      name: s.name,
      email: s.email,
      type: fmtText(s.projectType),
      status: s.status,
    },
    detail: (
      <div className="space-y-3">
        <Field label="Project details">
          <p className="whitespace-pre-wrap">{s.message}</p>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reference / artwork">{fmtText(s.reference)}</Field>
          <Field label="Wants shared Drive folder">{s.driveFolder ? "Yes" : "No"}</Field>
          <Field label="Received">{fmtDateTime(s.createdAt)}</Field>
          <Field label="Linked client">
            {s.client ? `${s.client.name} <${s.client.email}>` : "—"}
          </Field>
        </div>
        {s.sessionId && (journeys.get(s.sessionId)?.length ?? 0) > 0 && (
          <Field label="Pages viewed before submitting">
            <ol className="ml-4 list-decimal text-muted">
              {journeys.get(s.sessionId)!.map((path, i) => (
                <li key={i}>{path}</li>
              ))}
            </ol>
          </Field>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <form action={updateSubmissionStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={s.id} />
            <select
              name="status"
              defaultValue={s.status}
              className="rounded-lg border border-border bg-surface2 px-2 py-1.5 text-sm"
            >
              {SUBMISSION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
              Update status
            </button>
          </form>
          {s.projectId ? (
            <Link
              href={`/admin/projects/${s.projectId}/`}
              className="text-sm font-semibold text-blue"
            >
              Open linked project →
            </Link>
          ) : (
            <form action={convertSubmissionToProject}>
              <input type="hidden" name="id" value={s.id} />
              <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-black hover:bg-primary-hover">
                Convert to Project
              </button>
            </form>
          )}
          <form action={deleteSubmission} className="ml-auto">
            <input type="hidden" name="id" value={s.id} />
            <ConfirmButton
              message="Delete this submission permanently?"
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>
    ),
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Submissions</h1>
      <p className="mb-6 text-muted">Raw quote requests from the website form.</p>
      <RecordExplorer
        columns={columns}
        items={items}
        filename="kulworks-submissions"
        initialOpenId={open}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
