import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/format";
import { signProofPaths, itemLabel, publicProofUrl, isProofItemUpdated } from "@/lib/proofs";
import { site } from "@/data/site";
import CopyButton from "../../_components/CopyButton";
import ConfirmButton from "../../_components/ConfirmButton";
import ProofUploader from "../../_components/ProofUploader";
import {
  setProofActive,
  deleteProofItem,
  deleteProof,
  resolveProofComment,
  notifyProofClient,
} from "../../_proof-actions";

export const dynamic = "force-dynamic";

export default async function AdminProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = await prisma.proof.findUnique({
    where: { id },
    include: {
      project: { include: { client: true } },
      items: {
        orderBy: [{ position: "asc" }, { key: "asc" }],
        include: { comments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!proof) notFound();

  const url = publicProofUrl(site.url, proof.token);
  const thumbs = await signProofPaths(
    proof.items.flatMap((i) => [i.frontPath, i.backPath]).filter((p): p is string => !!p),
    60 * 60
  );
  const open = proof.items.flatMap((i) =>
    i.comments.filter((c) => c.fromClient && !c.resolvedAt).map((c) => ({ ...c, item: i }))
  );
  const approved = proof.items.filter((i) => i.approvedAt).length;
  const updated = proof.items.filter((i) => isProofItemUpdated(i)).length;
  const client = proof.project.client;
  const first = client.name.trim().split(/\s+/)[0] || client.name;

  return (
    <div className="space-y-6">
      <Link href={`/admin/projects/${proof.projectId}/`} className="text-sm font-semibold text-blue">
        ← {proof.project.title}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{proof.title}</h1>
          <p className="text-sm text-muted">
            {proof.widthIn} x {proof.heightIn} in · {proof.items.length} cards · {approved} approved · {updated} updated ·{" "}
            {open.length} open note{open.length === 1 ? "" : "s"}
            {proof.approvedAt && <b className="ml-2 text-green-600">Approved {fmtDateTime(proof.approvedAt)}</b>}
          </p>
        </div>
        <form action={setProofActive}>
          <input type="hidden" name="id" value={proof.id} />
          <input type="hidden" name="active" value={proof.active ? "false" : "true"} />
          <button
            className={`rounded-full px-4 py-2 text-sm font-bold ${proof.active ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}
            title={proof.active ? "Click to take the link down" : "Click to put the link back up"}
          >
            Link is {proof.active ? "ON" : "OFF"}
          </button>
        </form>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-lg font-bold">Client link</h2>
        <div className="flex flex-wrap items-center gap-2">
          <code className="break-all rounded bg-surface2 px-2 py-1 text-xs">{url}</code>
          <CopyButton text={url} />
          <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue">
            Open ↗
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">
          Anyone with this link can view and comment. Turn it OFF when the job is done.
        </p>
        {proof.active && client.email && (
          <form action={notifyProofClient} className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <input type="hidden" name="id" value={proof.id} />
            <ConfirmButton
              message={
                updated
                  ? `Email ${client.email} that ${updated} updated card${updated === 1 ? " is" : "s are"} ready?`
                  : `Email ${client.email} the link to this proof?`
              }
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-black hover:bg-primary-hover"
            >
              {updated ? `Let ${first} know (${updated} updated)` : `Email ${first} the link`}
            </ConfirmButton>
            <span className="text-xs text-muted">
              {proof.clientNotifiedAt ? `Last emailed ${fmtDateTime(proof.clientNotifiedAt)}` : "Not emailed from here yet"}
            </span>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Open notes ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted">Nothing open.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((c) => (
              <li key={c.id} className="rounded-lg bg-surface2 p-3 text-sm">
                <p className="text-xs text-muted">
                  Card {itemLabel(c.item.key)} · {c.side}
                  {c.x !== null && c.y !== null ? ` · marked at ${Math.round(c.x * 100)}% across, ${Math.round(c.y * 100)}% down` : ""}
                  {" · "}
                  {fmtDateTime(c.createdAt)}
                  {c.notifiedAt ? " · sent" : " · not sent yet"}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                <form action={resolveProofComment} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="reply"
                    placeholder="Optional reply the client will see"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-black hover:bg-primary-hover">
                    Mark done
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-bold">Cards</h2>
        <ProofUploader proofId={proof.id} widthIn={proof.widthIn} />
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {proof.items.map((i) => {
            const notes = i.comments.filter((c) => c.fromClient);
            return (
              <li key={i.id} className="rounded-lg border border-border bg-surface2 p-2 text-xs">
                <div className="grid grid-cols-2 gap-1">
                  {[i.frontPath, i.backPath].map((p, n) =>
                    p && thumbs.get(p) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={n} src={thumbs.get(p)} alt="" loading="lazy" className="w-full rounded" />
                    ) : (
                      <div key={n} className="flex aspect-[2/3] items-center justify-center rounded bg-surface text-muted">
                        {n ? "no back" : "no front"}
                      </div>
                    )
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-semibold">{itemLabel(i.key)}</span>
                  <span>
                    {isProofItemUpdated(i) && <b className="mr-1 rounded bg-primary px-1 text-black">Updated</b>}
                    {i.approvedAt && <b className="text-green-600">✓ </b>}
                    {notes.length > 0 && `${notes.filter((c) => !c.resolvedAt).length}/${notes.length} notes`}
                  </span>
                </div>
                {notes.some((c) => c.resolvedAt) && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted">Done notes</summary>
                    {notes
                      .filter((c) => c.resolvedAt)
                      .map((c) => (
                        <form key={c.id} action={resolveProofComment} className="mt-1">
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="reopen" value="true" />
                          <p className="whitespace-pre-wrap">{c.body}</p>
                          <button className="text-blue hover:underline">Reopen</button>
                        </form>
                      ))}
                  </details>
                )}
                <form action={deleteProofItem} className="mt-1">
                  <input type="hidden" name="id" value={i.id} />
                  <ConfirmButton message={`Remove card ${itemLabel(i.key)} and its notes?`} className="text-red-600 hover:underline">
                    Remove
                  </ConfirmButton>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <form action={deleteProof} className="border-t border-border pt-4">
        <input type="hidden" name="id" value={proof.id} />
        <ConfirmButton
          message="Delete this proof page, its card previews and all notes? The link stops working. The project itself is kept."
          className="text-sm font-semibold text-red-600 hover:underline"
        >
          Delete this proof
        </ConfirmButton>
      </form>
    </div>
  );
}
