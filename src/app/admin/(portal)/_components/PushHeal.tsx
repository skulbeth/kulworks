"use client";

import { useEffect } from "react";

// On every admin visit, re-send this device's push subscription (if it has one) so the
// server always holds the current one. Chrome sometimes swaps a subscription while Sam
// is signed out, and the service worker's own re-save then gets turned away; without
// this, alerts would stop until he next opened the Notifications page.
export default function PushHeal() {
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      const reg = await navigator.serviceWorker.getRegistration("/admin/");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      await fetch("/api/push/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), label: standalone ? "Android app" : undefined }),
      });
    })().catch(() => {});
  }, []);
  return null;
}
