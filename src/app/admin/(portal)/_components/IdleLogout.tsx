"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Signs the admin out after this much inactivity (no mouse/key/scroll/touch).
const IDLE_MS = 30 * 60 * 1000; // 30 minutes
// Last-activity time, shared across tabs. Timers freeze while Android has the app in the
// background, so we compare real elapsed time whenever the page comes back.
const LAST_KEY = "kw-admin-last-activity";

function readLast(fallback: number): number {
  try {
    const v = Number(localStorage.getItem(LAST_KEY));
    return Number.isFinite(v) && v > 0 ? Math.max(v, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export default function IdleLogout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(Date.now());
  const done = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const logout = async () => {
      if (done.current) return;
      done.current = true;
      if (timer.current) clearTimeout(timer.current);
      try {
        localStorage.removeItem(LAST_KEY);
      } catch {}
      // Local scope: only this browser/app signs out; other devices keep their sessions.
      await supabase.auth.signOut({ scope: "local" });
      // Also hit the logout route so the email-2FA cookie is cleared server-side.
      await fetch("/admin/logout/", { method: "POST" }).catch(() => {});
      router.push("/admin/login/");
      router.refresh();
    };

    // (Re)arm the timer for whatever is left of the idle window.
    const arm = () => {
      if (timer.current) clearTimeout(timer.current);
      const left = IDLE_MS - (Date.now() - last.current);
      if (left <= 0) {
        void logout();
        return;
      }
      timer.current = setTimeout(check, left);
    };

    // Timer fired (or page resumed): another tab may have seen activity since.
    const check = () => {
      last.current = readLast(last.current);
      arm();
    };

    // Real user activity: record it and restart the full window.
    const activity = () => {
      if (done.current) return;
      last.current = Date.now();
      try {
        localStorage.setItem(LAST_KEY, String(last.current));
      } catch {}
      arm();
    };

    // Coming back to the page is NOT activity: check how long we were really away first.
    const resume = () => {
      if (document.visibilityState === "visible") check();
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("resume", resume); // Chrome page-lifecycle (frozen → resumed)

    // Start the clock from the stored last activity, so an app the OS killed and reloaded
    // after 30 idle minutes still signs out. The login page stamps it on sign-in, and it is
    // cleared on idle-out, so a fresh sign-in never starts out "already idle".
    last.current = readLast(0) || Date.now();
    arm();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, activity));
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("resume", resume);
    };
  }, [router]);

  return null;
}
