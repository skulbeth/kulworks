import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { signProofPaths, itemLabel, isProofItemUpdated } from "@/lib/proofs";
import { site } from "@/data/site";
import ProofViewer, { type ViewerItem } from "./ProofViewer";
import MessageSam from "@/components/MessageSam";
import { loadJob, jobPath } from "@/lib/job";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
// Private review page. Never index it.
export const metadata: Metadata = { title: "Card proof", robots: { index: false, follow: false } };

export default async function ProofPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { token } = await params;
  const { msg } = await searchParams;
  const proof = await prisma.proof.findUnique({
    where: { token },
    include: {
      project: { include: { client: true } },
      items: {
        orderBy: [{ position: "asc" }, { key: "asc" }],
        include: { comments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!proof || proof.project.deletedAt) notFound();

  if (!proof.active) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">This proof is no longer available</h1>
        <p className="mt-3 text-muted">
          The review link has been closed. If you still need it, email{" "}
          <a className="font-semibold text-blue" href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </main>
    );
  }

  const paths = proof.items.flatMap((i) => [i.frontPath, i.backPath]).filter((p): p is string => !!p);
  const urls = await signProofPaths(paths);

  const items: ViewerItem[] = proof.items
    .filter((i) => i.frontPath || i.backPath)
    .map((i) => ({
      id: i.id,
      label: itemLabel(i.key),
      front: i.frontPath ? urls.get(i.frontPath) ?? null : null,
      back: i.backPath ? urls.get(i.backPath) ?? null : null,
      approved: !!i.approvedAt,
      updated: isProofItemUpdated(i),
      notes: i.comments.map((c) => ({
        id: c.id,
        side: c.side === "back" ? "back" : "front",
        x: c.x,
        y: c.y,
        body: c.body,
        fromClient: c.fromClient,
        sent: !!c.notifiedAt,
        done: !!c.resolvedAt,
      })),
    }));

  // Payment lives on the job page (the quote link), worked out by lib/job.ts like
  // everywhere else. Here: the way back to it, and a nudge once an invoice is due.
  const job = await loadJob(proof.projectId);
  const hub = job?.hub ?? null;
  const due = job?.unpaid.filter((r) => !r.isQuote) ?? [];
  const dueTotal = due.reduce((n, r) => n + r.amount, 0);

  return (
    <>
    <ProofViewer
      token={proof.token}
      title={proof.title}
      clientName={proof.project.client.name}
      widthIn={proof.widthIn}
      heightIn={proof.heightIn}
      approved={!!proof.approvedAt}
      items={items}
    />
      <section className="mx-auto max-w-2xl px-5 pb-12">
        {hub && due.length > 0 && (
          <div className="mt-4 rounded-2xl border border-blue/40 bg-blue/10 p-5 text-sm">
            <p className="font-bold">{proof.approvedAt ? "Thanks for approving! " : ""}Your invoice is ready: {fmtMoney(dueTotal)}</p>
            <p className="mt-0.5 text-muted">Pay it with Venmo or Zelle on your job page.</p>
            <a
              href={`${jobPath(hub.token)}#pay`}
              className="min-h-11 mt-3 inline-flex items-center rounded-full bg-primary px-5 py-2 font-bold text-black hover:bg-primary-hover"
            >
              Pay on my job page
            </a>
          </div>
        )}
        {hub && (
          <p className="mt-2 text-sm">
            <a href={jobPath(hub.token)} className="inline-block py-2 font-semibold text-blue hover:underline">
              Back to your job page ({hub.number}): quote, files and payment
            </a>
          </p>
        )}
        <MessageSam kind="proof" token={proof.token} status={msg} />
      </section>
    </>
  );
}
