"use client";

// Friendly error boundary for the admin portal — shown instead of a crash if a
// page throws (e.g., a transient database error).
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">
        This page hit an error loading. It&apos;s often a temporary database hiccup — try again.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-full bg-primary px-5 py-2 font-semibold text-black hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
