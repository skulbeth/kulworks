import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { site } from "@/data/site";
import { fmtDateTime } from "@/lib/format";
import { uploadsEnabled, signedUploadUrl } from "@/lib/uploads";
import { toggleUploads, markUploadHandled, deleteUpload } from "../_actions";
import ConfirmButton from "../_components/ConfirmButton";
import CopyButton from "../_components/CopyButton";

export const dynamic = "force-dynamic";

export default async function UploadsPage() {
  const uploadUrl = `${site.url}/upload`;
  const [enabled, qrDataUrl, uploads] = await Promise.all([
    uploadsEnabled(),
    QRCode.toDataURL(uploadUrl, { width: 240, margin: 1 }),
    prisma.upload.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const withUrls = await Promise.all(
    uploads.map(async (u) => ({
      ...u,
      urls: (
        await Promise.all(u.storagePaths.map((p) => signedUploadUrl(p)))
      ).filter(Boolean) as string[],
    }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Photo uploads</h1>
        <p className="text-muted">
          The public QR page where people send you photos to print (trade shows, events).
        </p>
      </div>

      {/* Toggle + QR + link */}
      <section className="grid gap-6 rounded-2xl border border-border bg-surface p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                enabled ? "bg-green-500/15 text-green-600" : "bg-surface2 text-muted"
              }`}
            >
              {enabled ? "● Uploads OPEN" : "○ Uploads closed"}
            </span>
            <form action={toggleUploads}>
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  enabled
                    ? "border border-border hover:border-red-500 hover:text-red-600"
                    : "bg-primary text-black hover:bg-primary-hover"
                }`}
              >
                {enabled ? "Close uploads" : "Open uploads"}
              </button>
            </form>
          </div>
          <p className="text-sm text-muted">
            Turn this <strong>on</strong> at a show, and <strong>off</strong> the rest of the time.
            While closed, the page tells visitors uploads aren&apos;t open. Photos land here and
            email you a copy with links.
          </p>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Public upload link
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <a href={uploadUrl} target="_blank" rel="noreferrer" className="text-blue hover:underline">
                {uploadUrl}
              </a>
              <CopyButton text={uploadUrl} label="Copy link" />
            </div>
          </div>
        </div>
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code to the upload page"
            width={200}
            height={200}
            className="mx-auto rounded-lg border border-border bg-white p-2"
          />
          <p className="mt-2 text-xs text-muted">Print this for your booth</p>
        </div>
      </section>

      {/* Uploads list */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Received photos</h2>
        {withUrls.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-6 text-muted">
            No uploads yet. Open uploads above and share the QR at your next show.
          </p>
        ) : (
          <ul className="space-y-4">
            {withUrls.map((u) => (
              <li
                key={u.id}
                className={`rounded-2xl border p-4 ${
                  u.status === "HANDLED" ? "border-border bg-surface/60" : "border-gold/40 bg-gold/5"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{u.name || "Someone"}</span>
                  {u.contact && (
                    <span className="flex items-center gap-1 text-sm text-muted">
                      {u.contact}
                      <CopyButton text={u.contact} label="Copy" />
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      u.status === "HANDLED" ? "bg-surface2 text-muted" : "bg-gold/15 text-gold"
                    }`}
                  >
                    {u.status}
                  </span>
                  <span className="ml-auto text-sm text-muted">{fmtDateTime(u.createdAt)}</span>
                </div>

                {u.note && <p className="mt-2 whitespace-pre-wrap text-sm">{u.note}</p>}

                {u.urls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {u.urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Upload ${i + 1}`}
                          className="h-28 w-28 rounded-lg border border-border object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                  {u.status !== "HANDLED" && (
                    <form action={markUploadHandled}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:border-blue hover:text-blue">
                        Mark handled
                      </button>
                    </form>
                  )}
                  <form action={deleteUpload} className="ml-auto">
                    <input type="hidden" name="id" value={u.id} />
                    <ConfirmButton
                      message="Delete this upload and its photos? This removes the images for good."
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
