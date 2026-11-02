"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { canResetPassword, setNewPassword } from "./_actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Only a reset/invite-link session (or a fully 2FA-verified admin) may set a password.
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    canResetPassword()
      .then((r) => setAllowed(r.ok))
      .catch(() => setAllowed(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const r = await setNewPassword(password).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    if (!r.ok) {
      setError(r.error);
      setStatus("error");
      return;
    }
    router.push("/admin/");
    router.refresh();
  }

  const field =
    "w-full rounded-lg border border-border bg-surface2 px-4 py-3 text-foreground focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      {allowed === false ? (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          This page only works from a password-reset email link. Request a new link from the{" "}
          <Link href="/admin/login/" className="font-semibold underline">sign-in page</Link>.
        </p>
      ) : (
      <>
      <p className="mt-1 text-muted">Enter a new password for your admin account.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password"
          className={field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={status === "saving" || allowed !== true}
          className="w-full rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save new password"}
        </button>
      </form>
      </>
      )}
    </main>
  );
}
