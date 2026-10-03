import type { Metadata } from "next";
import Container from "@/components/Container";
import TestimonialForm from "@/components/TestimonialForm";
import { prisma } from "@/lib/prisma";
import { MAX_QUOTE_CHARS } from "@/lib/testimonials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leave a testimonial",
  // A private, single-use link. Keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function TestimonialTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const row = await prisma.testimonial.findFirst({
    where: { token, deletedAt: null },
    select: { id: true, name: true, submittedAt: true },
  });

  const gone = !row;
  const alreadyDone = !!row?.submittedAt;

  return (
    <section className="border-b border-border">
      <Container className="py-16">
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Kulworks</p>

          {gone ? (
            <>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">This link has expired</h1>
              <p className="mt-4 rounded-xl border border-border bg-surface p-6 text-muted">
                It may have already been used, or been withdrawn. If you still want to leave a few
                words,{" "}
                <a href="/contact/" className="font-semibold text-blue hover:underline">
                  drop us a line
                </a>{" "}
                and we&apos;ll send a fresh one.
              </p>
            </>
          ) : alreadyDone ? (
            <>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Already sent</h1>
              <p className="mt-4 rounded-xl border border-border bg-surface p-6 text-muted">
                Thanks, {row.name.split(" ")[0]} - we have your words. If you want to change
                anything,{" "}
                <a href="/contact/" className="font-semibold text-blue hover:underline">
                  let us know
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Hi {row.name.split(" ")[0]}, how did we do?
              </h1>
              <p className="mt-3 text-lg text-muted">
                If you&apos;d be happy to say a few words about what we made for you, it genuinely
                helps the next person decide. Two or three sentences is plenty, and nothing goes on
                the site until you tick the box below.
              </p>
              <div className="mt-8">
                <TestimonialForm
                  token={token}
                  name={row.name}
                  maxChars={MAX_QUOTE_CHARS}
                />
              </div>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
