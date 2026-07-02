"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fires a cookieless page-view beacon on each route change (skips /admin).
// The session id lives in sessionStorage (cleared when the tab closes).
function getSessionId(): string | null {
  try {
    let id = sessionStorage.getItem("kw_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("kw_sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      sessionId: getSessionId(),
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track/", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      /* never break the page */
    }
  }, [pathname]);

  return null;
}
