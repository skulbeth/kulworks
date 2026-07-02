"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
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
          disabled={status === "saving"}
          className="w-full rounded-full bg-primary px-6 py-3 font-bold text-black hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}
