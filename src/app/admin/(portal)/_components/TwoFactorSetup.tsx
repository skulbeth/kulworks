"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setTwoFactorEnabled } from "../_actions";

// Two-factor for the logged-in admin. A master switch turns 2FA on/off; when on, you get a
// code by EMAIL by default, and can optionally add an authenticator APP for app-based codes.
// The email path is custom (Supabase has no email factor); the app path is Supabase TOTP.
export default function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const supabase = createClient();
  const [app, setApp] = useState<"loading" | "off" | "enrolling" | "on">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return setApp("off");
    const verified = data.totp.find((f) => f.status === "verified");
    if (verified) {
      setFactorId(verified.id);
      setApp("on");
    } else {
      setApp("off");
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return setError(error.message);
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setApp("enrolling");
  }

  async function verifyApp() {
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
    setApp("on");
  }

  async function removeApp() {
    if (!factorId) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    setFactorId(null);
    setApp("off");
  }

  const field =
    "rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none";
  const btn = "rounded-full bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary-hover disabled:opacity-60";
  const btnGhost =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-blue hover:text-blue disabled:opacity-60";

  // ── 2FA OFF ──
  if (!enabled) {
    return (
      <div>
        <p className="text-sm text-muted">
          Add a second step when you sign in. We&apos;ll <strong>email you a 6-digit code</strong> by
          default — or you can set up an <strong>authenticator app</strong> after enabling.
        </p>
        <form action={setTwoFactorEnabled} className="mt-3">
          <input type="hidden" name="enable" value="true" />
          <button className={btn}>Enable two-factor auth</button>
        </form>
      </div>
    );
  }

  // ── 2FA ON ──
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-green-600">✅ Two-factor authentication is ON.</p>
        <p className="mt-1 text-sm text-muted">
          When you sign in you&apos;ll enter a 6-digit code. At login you can choose to have it{" "}
          <strong>emailed</strong> to you{app === "on" ? " or read it from your authenticator app" : ""}.
        </p>
      </div>

      {/* Authenticator app (optional) */}
      <div className="rounded-lg border border-border bg-surface2 p-3">
        <p className="text-sm font-semibold">Authenticator app (optional)</p>
        {app === "loading" && <p className="mt-1 text-sm text-muted">Checking…</p>}

        {app === "on" && (
          <div className="mt-1">
            <p className="text-sm text-muted">📱 An authenticator app is set up.</p>
            <button onClick={removeApp} disabled={busy} className={`mt-2 ${btnGhost}`}>
              Remove app
            </button>
          </div>
        )}

        {app === "off" && (
          <div className="mt-1">
            <p className="text-sm text-muted">
              Prefer app codes over email? Set one up (Google Authenticator, Authy, 1Password…).
            </p>
            <button onClick={startEnroll} disabled={busy} className={`mt-2 ${btnGhost}`}>
              Set up authenticator app
            </button>
          </div>
        )}

        {app === "enrolling" && (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted">1. Scan this with your authenticator app:</p>
            {qr && (
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
              <button onClick={verifyApp} disabled={busy || code.length !== 6} className={btn}>
                Verify &amp; save
              </button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {/* Turn off */}
      <form action={setTwoFactorEnabled}>
        <input type="hidden" name="enable" value="false" />
        <button className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-red-500 hover:text-red-600">
          Turn off 2FA
        </button>
      </form>
    </div>
  );
}
