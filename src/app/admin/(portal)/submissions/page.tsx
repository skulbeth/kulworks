import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtDateTime, fmtText } from "@/lib/format";
import {
  updateSubmissionStatus,
  convertSubmissionToProject,
  deleteSubmission,
  sendClientEmail,
  createSubmissionDriveFolder,
} from "../_actions";
import RecordExplorer, {
  type ExplorerColumn,
  type ExplorerItem,
} from "../_components/RecordExplorer";
import ConfirmButton from "../_components/ConfirmButton";
import CopyButton from "../_components/CopyButton";

export const dynamic = "force-dynamic";

const SUBMISSION_STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];

const columns: ExplorerColumn[] = [
  { key: "created", label: "Received" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
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
    search: [s.name, s.email, s.phone, s.projectType, s.message, s.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    cells: {
      created: fmtDateTime(s.createdAt),
      name: s.name,
      email: s.email,
      phone: fmtText(s.phone),
      type: fmtText(s.projectType),
      status: s.status,
    },
    detail: (
      <div className="space-y-3">
        <Field label="Project details">
          <p className="whitespace-pre-wrap">{s.message}</p>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email">
            <div className="flex items-center gap-2">
              <a href={`mailto:${s.email}`} className="text-blue hover:underline">
                {s.email}
              </a>
              <CopyButton text={s.email} label="Copy" />
            </div>
          </Field>
          <Field label="Phone">
            <div className="flex items-center gap-2">
              {fmtText(s.phone)}
              {s.phone && <CopyButton text={s.phone} label="Copy" />}
            </div>
          </Field>
          <Field label="Reference / artwork">{fmtText(s.reference)}</Field>
          <Field label="Shared Drive folder">
            {s.driveFolderUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={s.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue hover:underline"
                >
                  Open folder →
                </a>
                <CopyButton text={s.driveFolderUrl} label="Copy link" />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted">
                  {s.driveFolder ? "Requested, not created yet" : "None"}
                </span>
                <form action={createSubmissionDriveFolder}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:border-blue hover:text-blue">
                    Create shared folder
                  </button>
                </form>
              </div>
            )}
          </Field>
          <Field label="Received">{fmtDateTime(s.createdAt)}</Field>
          <Field label="Linked client">
            {s.client ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/clients/${s.client.id}/`}
                  className="text-blue hover:underline"
                >
                  {s.client.name} &lt;{s.client.email}&gt;
                </Link>
                <CopyButton text={s.client.email} label="Copy" />
              </div>
            ) : (
              "—"
            )}
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
        {s.client && (
          <div className="rounded-xl border border-border bg-surface2/40 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Email {s.client.name}
            </div>
            <form action={sendClientEmail} className="space-y-2">
              <input type="hidden" name="clientId" value={s.client.id} />
              <input
                name="subject"
                required
                placeholder="Subject"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-blue focus:outline-none"
              />
              <textarea
                name="body"
                required
                rows={4}
                placeholder="Write your reply or quote… (blank lines start new paragraphs)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-blue focus:outline-none"
              />
              {s.driveFolderUrl && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="attachFolderUrl"
                    value={s.driveFolderUrl}
                    className="h-4 w-4 accent-primary"
                  />
                  Include the shared Drive folder link
                </label>
              )}
              <ConfirmButton
                message={`Send this email to ${s.email}?`}
                className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover"
              >
                Send email →
              </ConfirmButton>
            </form>
            <p className="mt-2 text-xs text-muted">
              Sends from contact@kulworks.com (replies come to you) and is logged on the client.
              You&apos;ll land on the client page after sending.
            </p>
          </div>
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
              message="Archive this submission? It's hidden from your list but kept — you can restore it from the Archive tab."
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
