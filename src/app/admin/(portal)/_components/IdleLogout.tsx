"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Signs the admin out after this much inactivity (no mouse/key/scroll/touch).
const IDLE_MS = 30 * 60 * 1000; // 30 minutes

export default function IdleLogout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/admin/login/");
        router.refresh();
      }, IDLE_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset(); // start the clock

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router]);

  return null;
}
