"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lets the logged-in admin turn on/off two-factor auth (TOTP / authenticator app).
// Supabase manages the factors; this just drives enroll → verify → done, and disable.
export default function TwoFactorSetup() {
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "off" | "enrolling" | "on">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return setStatus("off");
    const verified = data.totp.find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setStatus("on");
    } else {
      setStatus("off");
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    // Clear any half-finished (unverified) factor first.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return setError(error.message);
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setStatus("enrolling");
  }

  async function verify() {
    if (!factorId) return;
    setError(null);
    setBusy(true);
    const ch = await supabase.auth.mfa.challenge({ factorId });
    if (ch.error) {
      setBusy(false);
      return setError(ch.error.message);
    }
    const v = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
    setBusy(false);
    if (v.error) return setError(v.error.message);
    setQr(null);
    setCode("");
    setStatus("on");
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    setFactorId(null);
    setStatus("off");
  }

  const field =
    "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";

  if (status === "loading") return <p className="text-sm text-muted">Checking…</p>;

  if (status === "on") {
    return (
      <div>
        <p className="text-sm font-semibold text-green-600">✅ Two-factor auth is ON.</p>
        <p className="mt-1 text-sm text-muted">
          You&apos;ll enter a code from your authenticator app each time you sign in.
        </p>
        <button onClick={disable} disabled={busy} className="mt-3 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-red-500 hover:text-red-600 disabled:opacity-60">
          Turn off 2FA
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (status === "enrolling") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          1. Scan this with your authenticator app (Google Authenticator, Authy, 1Password…).
        </p>
        {qr && (
          // Supabase returns the QR as an SVG data URI.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="2FA QR code" className="h-44 w-44 rounded-lg border border-border bg-white p-2" />
        )}
        <p className="text-sm text-muted">2. Enter the 6-digit code it shows:</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
            className={`w-32 ${field}`}
          />
          <button onClick={verify} disabled={busy || code.length !== 6} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover disabled:opacity-60">
            Verify & enable
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // off
  return (
    <div>
      <p className="text-sm text-muted">
        Add a second step at login — a code from your phone&apos;s authenticator app.
      </p>
      <button onClick={startEnroll} disabled={busy} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover disabled:opacity-60">
        Enable 2FA
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
