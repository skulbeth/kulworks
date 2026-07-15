import Button from "@/components/Button";

// Custom 404. Rendered inside the root layout, so the marketing header/footer apply.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">404</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Page not found</h1>
      <p className="mt-4 text-lg text-muted">
        That page doesn&apos;t exist or may have moved. Let&apos;s get you back on track.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/" variant="gold">Back home</Button>
        <Button href="/services/" variant="ghost">Browse services</Button>
        <Button href="/contact/" variant="ghost">Get a quote</Button>
      </div>
      <p className="mt-10 text-sm text-muted">
        Looking for something specific? Try the{" "}
        <a href="/guides/" className="text-blue hover:underline">guides &amp; FAQ</a> or{" "}
        <a href="/portfolio/" className="text-blue hover:underline">portfolio</a>.
      </p>
    </main>
  );
}
