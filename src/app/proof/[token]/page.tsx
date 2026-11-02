import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { signProofPaths, itemLabel, isProofItemUpdated } from "@/lib/proofs";
import { site } from "@/data/site";
import ProofViewer, { type ViewerItem } from "./ProofViewer";
import MessageSam from "@/components/MessageSam";
import PayOptions from "@/components/PayOptions";
import { projectBilling } from "@/lib/billing";
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

  // Payment for the job right here (the quote page is still the hub), and the link back.
  const { hub, docs } = await projectBilling(proof.projectId);
  const unpaid = docs.filter((d) => !d.paid);

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
        {docs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
            <p className="font-bold">Payment</p>
            <ul className="mt-3 space-y-5">
              {docs.map((d) => (
                <li key={d.token}>
                  {d.paid ? (
                    <p className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-600">
                      {d.kind === "Invoice" ? d.number : `${d.kind} (${d.number})`}: {fmtMoney(d.amount)} paid. Thank you!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {d.kind === "Invoice" ? d.number : `${d.kind} (${d.number})`}: {fmtMoney(d.amount)} due
                        </span>{" "}
                        <a href={`/invoice/${d.token}/`} className="inline-block py-1 text-blue hover:underline">
                          See the details
                        </a>
                      </p>
                      <PayOptions amount={d.amount} note={`${site.name} ${d.number}`} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {unpaid.length === 0 && (
              <p className="mt-3 text-xs text-muted">Everything billed so far is paid.</p>
            )}
          </div>
        )}
        {hub && (
          <p className="mt-2 text-sm">
            <a href={`/invoice/${hub.token}/`} className="inline-block py-2 font-semibold text-blue hover:underline">
              View your {hub.number.startsWith("Q") ? "quote" : "invoice"} ({hub.number})
            </a>
          </p>
        )}
        <MessageSam kind="proof" token={proof.token} status={msg} />
      </section>
    </>
  );
}
