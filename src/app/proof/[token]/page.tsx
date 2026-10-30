import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { signProofPaths, itemLabel } from "@/lib/proofs";
import { site } from "@/data/site";
import ProofViewer, { type ViewerItem } from "./ProofViewer";

export const dynamic = "force-dynamic";
// Private review page. Never index it.
export const metadata: Metadata = { title: "Card proof", robots: { index: false, follow: false } };

export default async function ProofPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
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

  return (
    <ProofViewer
      token={proof.token}
      title={proof.title}
      clientName={proof.project.client.name}
      widthIn={proof.widthIn}
      heightIn={proof.heightIn}
      approved={!!proof.approvedAt}
      items={items}
    />
  );
}
