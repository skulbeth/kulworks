import type { Metadata } from "next";
import Container from "@/components/Container";
import UploadForm from "@/components/UploadForm";
import { uploadsEnabled, MAX_FILES, MAX_FILE_BYTES } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send Kulworks a Photo",
  description: "Upload a photo to Kulworks to have it printed.",
  robots: { index: false, follow: false },
};

export default async function UploadPage() {
  const enabled = await uploadsEnabled();

  return (
    <section className="border-b border-border">
      <Container className="py-16">
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Kulworks</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Send us your photo</h1>

          {enabled ? (
            <>
              <p className="mt-3 text-lg text-muted">
                Snap a picture or pick one from your phone and send it straight to us. We&apos;ll
                use it to prep your print. Add your name and what you&apos;d like made so we can
                follow up.
              </p>
              <div className="mt-8">
                <UploadForm
                  maxFiles={MAX_FILES}
                  maxSizeMb={Math.round(MAX_FILE_BYTES / 1024 / 1024)}
                />
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-border bg-surface p-6 text-muted">
              Photo uploads aren&apos;t open right now. Catch us at an event, or{" "}
              <a href="/contact/" className="font-semibold text-blue hover:underline">
                get a quote
              </a>{" "}
              and we&apos;ll take it from there.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
