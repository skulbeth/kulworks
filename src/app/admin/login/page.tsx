"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import { getMy2faStatus, sendEmail2faCode, verifyEmail2faCode } from "./_actions";

export default function AdminLoginPage() {
  const [mode, setMode] = useState<"login" | "forgot" | "2fa">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 2FA step state
  const [hasTotp, setHasTotp] = useState(false);
  const [method, setMethod] = useState<"choose" | "app" | "email">("choose");
  const [code, setCode] = useState("");
  const [appFactorId, setAppFactorId] = useState<string | null>(null);
  const [appChallengeId, setAppChallengeId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const field =
    "w-full rounded-lg border border-border bg-surface2 px-4 py-3 text-foreground placeholder:text-muted/60 focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const label = "mb-1.5 block text-sm font-semibold";
  const primaryBtn =
    "w-full rounded-full bg-primary px-6 py-3 font-bold text-black transition-all hover:bg-primary-hover disabled:opacity-60";

  // If a session already exists (fresh visit or the guard bounced them here), decide what to show.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await routeAfterPassword();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a valid password (or on mount with a session): finish, or start the 2FA step.
  async function routeAfterPassword() {
    try {
      const status = await getMy2faStatus();
      if (!status.authed) {
        setBusy(false);
        return;
      }
      if (!status.enabled || status.verified) {
        // Hard navigation so the new session cookie is definitely picked up.
        window.location.href = "/admin/";
        return;
      }
      setHasTotp(status.hasTotp);
      setError(null);
      setBusy(false);
      setMode("2fa");
      if (status.hasTotp) {
        setMethod("choose"); // let them pick app vs email
      } else {
        await chooseEmail(); // email is the only option → send right away
      }
    } catch {
      // Password already succeeded; if the status check hiccups, don't get stuck on
      // the spinner — go to the dashboard and let the server guard re-check.
      window.location.href = "/admin/";
    }
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
    await routeAfterPassword();
  }

  async function chooseApp() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find((f) => f.status === "verified");
    if (!totp) {
      setBusy(false);
      return setError("No authenticator app is set up on this account.");
    }
    const ch = await supabase.auth.mfa.challenge({ factorId: totp.id });
    setBusy(false);
    if (ch.error) return setError(ch.error.message);
    setAppFactorId(totp.id);
    setAppChallengeId(ch.data.id);
    setCode("");
    setMethod("app");
  }

  async function chooseEmail() {
    setError(null);
    setBusy(true);
    const r = await sendEmail2faCode();
    setBusy(false);
    if (!r.ok) return setError("Couldn't send the code. Please try again.");
    setCode("");
    setMethod("email");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (method === "app") {
      if (!appFactorId || !appChallengeId) {
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const v = await supabase.auth.mfa.verify({
        factorId: appFactorId,
        challengeId: appChallengeId,
        code,
      });
      if (v.error) {
        setBusy(false);
        return setError(v.error.message);
      }
    } else {
      const r = await verifyEmail2faCode(code);
      if (!r.ok) {
        setBusy(false);
        return setError(
          r.error === "too-many"
            ? "Too many tries. Request a new code."
            : r.error === "expired"
            ? "That code expired — request a new one."
            : "That code didn't match. Try again."
        );
      }
    }
    window.location.href = "/admin/";
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

      {mode === "2fa" ? (
        method === "choose" ? (
          <>
            <p className="mt-1 text-muted">How do you want your sign-in code?</p>
            <div className="mt-8 space-y-3">
              <button onClick={chooseApp} disabled={busy} className={primaryBtn}>
                📱 Use my authenticator app
              </button>
              <button
                onClick={chooseEmail}
                disabled={busy}
                className="w-full rounded-full border border-border px-6 py-3 font-semibold transition-all hover:border-blue hover:text-blue disabled:opacity-60"
              >
                ✉️ Email me a code
              </button>
              {errorBox}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-muted">
              {method === "app"
                ? "Enter the 6-digit code from your authenticator app."
                : "We emailed you a 6-digit code. Enter it below."}
            </p>
            <form onSubmit={submitCode} className="mt-8 space-y-4">
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
              <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
                {busy ? "Verifying…" : "Verify"}
              </button>
            </form>
            <div className="mt-4 flex gap-4 text-sm">
              {method === "email" && (
                <button onClick={chooseEmail} disabled={busy} className="font-semibold text-blue hover:underline">
                  Resend code
                </button>
              )}
              {hasTotp && (
                <button
                  onClick={() => { setError(null); setCode(""); setMethod("choose"); }}
                  className="font-semibold text-blue hover:underline"
                >
                  Use a different method
                </button>
              )}
            </div>
          </>
        )
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
            <button type="submit" disabled={busy} className={primaryBtn}>
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
            <button type="submit" disabled={busy} className={primaryBtn}>
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
