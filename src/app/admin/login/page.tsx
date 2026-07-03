"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot" | "mfa">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const field =
    "w-full rounded-lg border border-border bg-surface2 px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const label = "mb-1.5 block text-sm font-semibold";

  // If a session already needs a 2FA step (e.g., the guard bounced them here), show it.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await proceedOrMfa();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a password login (or on mount with a session): either finish, or require the 2FA code.
  async function proceedOrMfa() {
    const supabase = createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (totp) {
        const ch = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (!ch.error) {
          setMfaFactorId(totp.id);
          setMfaChallengeId(ch.data.id);
          setMode("mfa");
          setBusy(false);
          return;
        }
      }
    }
    router.push("/admin/");
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    await proceedOrMfa();
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || !mfaChallengeId) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/admin/");
    router.refresh();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin/reset/`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  const errorBox = error && (
    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
      {error}
    </p>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <h1 className="text-2xl font-bold">Kulworks Admin</h1>

      {mode === "mfa" ? (
        <>
          <p className="mt-1 text-muted">Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={handleMfa} className="mt-8 space-y-4">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              className={field}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            {errorBox}
            <button type="submit" disabled={busy || code.length !== 6}
              className="w-full rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover disabled:opacity-60">
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>
        </>
      ) : mode === "login" ? (
        <>
          <p className="mt-1 text-muted">Sign in to manage clients, quotes, and projects.</p>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className={label} htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className={field}
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="password">Password</label>
              <input id="password" type="password" required autoComplete="current-password" className={field}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {errorBox}
            <button type="submit" disabled={busy}
              className="w-full rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <button onClick={() => { setMode("forgot"); setError(null); }}
            className="mt-4 text-sm font-semibold text-blue hover:underline">
            Forgot password?
          </button>
        </>
      ) : sent ? (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-surface p-6">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-sm text-muted">
            If an account exists for {email}, we&apos;ve sent a link to reset your password.
          </p>
          <button onClick={() => { setMode("login"); setSent(false); }}
            className="mt-4 text-sm font-semibold text-blue hover:underline">
            ← Back to sign in
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-muted">Enter your email and we&apos;ll send a reset link.</p>
          <form onSubmit={handleForgot} className="mt-8 space-y-4">
            <div>
              <label className={label} htmlFor="femail">Email</label>
              <input id="femail" type="email" required autoComplete="email" className={field}
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {errorBox}
            <button type="submit" disabled={busy}
              className="w-full rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover disabled:opacity-60">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <button onClick={() => { setMode("login"); setError(null); }}
            className="mt-4 text-sm font-semibold text-blue hover:underline">
            ← Back to sign in
          </button>
        </>
      )}
    </main>
  );
}
