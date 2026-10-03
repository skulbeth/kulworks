import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/format";
import { signedUploadUrl } from "@/lib/uploads";
import { MAX_QUOTE_CHARS, publicTestimonialUrl } from "@/lib/testimonials";
import {
  addTestimonial,
  updateTestimonial,
  publishTestimonial,
  unpublishTestimonial,
  toggleTestimonialFeatured,
  archiveTestimonial,
  restoreTestimonial,
} from "../_testimonial-actions";
import ConfirmButton from "../_components/ConfirmButton";
import CopyButton from "../_components/CopyButton";
import ResultBanner from "../_components/ResultBanner";
import SectionTabs, { SECTIONS } from "../_components/SectionTabs";

export const dynamic = "force-dynamic";

const SITE_URL = "https://kulworks.com";
const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-blue focus:outline-none";

export default async function TestimonialsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string; show?: string }>;
}) {
  const sp = await searchParams;
  const showArchived = sp.show === "archived";

  const rows = await prisma.testimonial.findMany({
    where: showArchived ? { deletedAt: { not: null } } : { deletedAt: null },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { client: { select: { id: true, name: true } } },
  });

  // Screenshots live in the private bucket; the admin view signs its own URLs so
  // it can show pending ones, which the public image route deliberately will not.
  const withImages = await Promise.all(
    rows.map(async (t) => ({
      ...t,
      imageUrl: t.imagePath ? await signedUploadUrl(t.imagePath) : null,
    }))
  );

  const pending = withImages.filter((t) => t.status === "PENDING" && t.submittedAt);
  const awaiting = withImages.filter((t) => t.status === "PENDING" && !t.submittedAt && t.token);
  const drafts = withImages.filter((t) => t.status === "PENDING" && !t.submittedAt && !t.token);
  const live = withImages.filter((t) => t.status === "PUBLISHED");
  const archived = withImages.filter((t) => t.deletedAt);

  return (
    <div className="space-y-8">
      <div>
        <SectionTabs tabs={SECTIONS.work} active="/admin/testimonials/" />
        <h1 className="text-2xl font-bold">Testimonials</h1>
        <p className="text-muted">
          Two ways in: ask a client from their record, or add one you already have. Nothing shows
          on the site until you publish it.
        </p>
      </div>

      <ResultBanner done={sp.done} error={sp.error} basePath="/admin/testimonials/" />

      {/* ── Add one you already have ── */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-bold">Add one you already have</h2>
        <p className="mt-1 text-sm text-muted">
          A quote from an email or a text, a screenshot of it, or both. Paste the words as well as
          the screenshot where you can: a picture cannot be read by a screen reader or by Google.
        </p>
        <form action={addTestimonial} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Their words
            </span>
            <textarea name="quote" rows={4} maxLength={MAX_QUOTE_CHARS} className={input} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Name to show *
            </span>
            <input name="name" required maxLength={80} placeholder="Aaron D." className={input} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Context
            </span>
            <input
              name="detail"
              maxLength={120}
              placeholder="Game designer, San Antonio"
              className={input}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Screenshot
            </span>
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface2 file:px-3 file:py-2 file:text-sm file:font-semibold"
            />
          </label>

          <div className="sm:col-span-2 rounded-xl border border-border bg-surface2/40 p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="consent" className="mt-1 h-4 w-4" />
              <span className="text-sm">
                <strong>They are happy for this to be published.</strong>
                <span className="mt-0.5 block text-muted">
                  Required before it can go live. These are someone else&apos;s words, and putting
                  them on the site is an endorsement, so ask first.
                </span>
              </span>
            </label>
            <input
              name="consentNote"
              maxLength={200}
              placeholder="How permission was given, e.g. said yes by text on 2 Oct"
              className={`${input} mt-3`}
            />
          </div>

          <div className="sm:col-span-2">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary-hover">
              Save as pending
            </button>
          </div>
        </form>
      </section>

      {!showArchived && (
        <>
          <Group
            title="Waiting on you"
            hint="They wrote these. Read them, then publish."
            rows={pending}
          />
          <Group
            title="Published"
            hint="Live on /testimonials. Pin up to three to show on the home page."
            rows={live}
          />
          <Group
            title="Drafts you added"
            hint="Not sent by a client, not live yet."
            rows={drafts}
          />
          {awaiting.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-bold">Asked, not written yet</h2>
              <p className="mb-3 text-sm text-muted">
                Their link still works. Copy it if you want to send it another way.
              </p>
              <ul className="space-y-2">
                {awaiting.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4"
                  >
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-sm text-muted">
                      asked {t.requestedAt ? fmtDateTime(t.requestedAt) : "-"}
                    </span>
                    <CopyButton
                      text={publicTestimonialUrl(SITE_URL, t.token as string)}
                      label="Copy their link"
                    />
                    <form action={archiveTestimonial} className="ml-auto">
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmButton
                        message="Withdraw this request? Their link stops working."
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Withdraw
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {showArchived && (
        <Group title="Archived" hint="Nothing is deleted. Restore it to bring it back." rows={archived} />
      )}

      <div>
        <a
          href={showArchived ? "/admin/testimonials/" : "/admin/testimonials/?show=archived"}
          className="text-sm font-semibold text-blue hover:underline"
        >
          {showArchived ? "← Back to active" : `Show archived (${archived.length})`}
        </a>
      </div>
    </div>
  );
}

type Row = Awaited<ReturnType<typeof prisma.testimonial.findMany>>[number] & {
  imageUrl: string | null;
  client: { id: string; name: string } | null;
};

function Group({ title, hint, rows }: { title: string; hint: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 text-lg font-bold">
        {title} <span className="font-normal text-muted">({rows.length})</span>
      </h2>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      <ul className="space-y-4">
        {rows.map((t) => (
          <Card key={t.id} t={t} />
        ))}
      </ul>
    </section>
  );
}

function Card({ t }: { t: Row }) {
  const isLive = t.status === "PUBLISHED";
  return (
    <li
      className={`rounded-2xl border p-4 ${
        isLive ? "border-green-500/40 bg-green-500/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{t.name}</span>
        {t.detail && <span className="text-sm text-muted">{t.detail}</span>}
        <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold text-muted">
          {t.source === "REQUESTED" ? "from client" : "added by you"}
        </span>
        {t.featured && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
            on home page
          </span>
        )}
        {!t.consent && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
            no permission recorded
          </span>
        )}
        <span className="ml-auto text-sm text-muted">
          {t.submittedAt ? fmtDateTime(t.submittedAt) : fmtDateTime(t.createdAt)}
        </span>
      </div>

      {t.client && (
        <a
          href={`/admin/clients/${t.client.id}/`}
          className="mt-1 inline-block text-sm text-blue hover:underline"
        >
          {t.client.name} &rarr;
        </a>
      )}

      <form action={updateTestimonial} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={t.id} />
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Their words
          </span>
          <textarea
            name="quote"
            rows={3}
            defaultValue={t.quote ?? ""}
            maxLength={MAX_QUOTE_CHARS}
            className={input}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Name to show
          </span>
          <input name="name" defaultValue={t.name} maxLength={80} className={input} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Context
          </span>
          <input name="detail" defaultValue={t.detail ?? ""} maxLength={120} className={input} />
        </label>

        <div className="sm:col-span-2 rounded-xl border border-border bg-surface2/40 p-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              defaultChecked={t.consent}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm">
              They are happy for this to be published
              <span className="mt-0.5 block text-muted">
                Unticking this on a live testimonial takes it straight off the site.
              </span>
            </span>
          </label>
          <input
            name="consentNote"
            defaultValue={t.consentNote ?? ""}
            maxLength={200}
            placeholder="How permission was given"
            className={`${input} mt-2`}
          />
        </div>

        <div className="sm:col-span-2">
          <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
            Save changes
          </button>
        </div>
      </form>

      {t.imageUrl && (
        <a href={t.imageUrl} target="_blank" rel="noreferrer" className="mt-3 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.imageUrl}
            alt={`Screenshot from ${t.name}`}
            className="max-h-64 rounded-lg border border-border"
          />
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
        {!t.deletedAt && !isLive && (
          <form action={publishTestimonial}>
            <input type="hidden" name="id" value={t.id} />
            <button
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-black hover:bg-primary-hover disabled:opacity-50"
              title={
                t.consent
                  ? "Put this on the site"
                  : "Record permission first, further up this card"
              }
            >
              Publish
            </button>
          </form>
        )}
        {isLive && (
          <>
            <form action={toggleTestimonialFeatured}>
              <input type="hidden" name="id" value={t.id} />
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-gold hover:text-gold">
                {t.featured ? "Unpin from home" : "Pin to home"}
              </button>
            </form>
            <form action={unpublishTestimonial}>
              <input type="hidden" name="id" value={t.id} />
              <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
                Take off the site
              </button>
            </form>
          </>
        )}
        {t.deletedAt ? (
          <form action={restoreTestimonial}>
            <input type="hidden" name="id" value={t.id} />
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
              Restore
            </button>
          </form>
        ) : (
          <form action={archiveTestimonial} className="ml-auto">
            <input type="hidden" name="id" value={t.id} />
            <ConfirmButton
              message="Archive this testimonial? It comes off the site, but nothing is deleted and you can restore it."
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Archive
            </ConfirmButton>
          </form>
        )}
      </div>
    </li>
  );
}
