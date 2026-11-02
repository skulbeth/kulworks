// Kulworks admin service worker: push notifications only.
//
// Registered with scope /admin/, so it never touches the public site. It does no
// fetch caching on purpose: admin pages are always live data, and a stale cached
// quote or payment status would be worse than an offline error.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Kulworks", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Kulworks";
  const url = data.id ? `/admin/notifications/open/${data.id}/` : data.url || "/admin/notifications/";
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/app/icon-192.png",
        badge: "/app/badge-96.png",
        tag: data.tag || undefined,
        renotify: !!data.tag,
        requireInteraction: !!data.urgent,
        data: { url },
      });
      // Unread dot on the app icon (where the launcher supports it).
      if (self.navigator && "setAppBadge" in self.navigator) {
        try {
          await self.navigator.setAppBadge();
        } catch {}
      }
      // Let an open admin tab refresh its bell count.
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      tabs.forEach((c) => c.postMessage({ type: "kulworks-push", data }));
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/notifications/";
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const mine = new Set((await self.clients.matchAll({ type: "window" })).map((c) => c.id));
      for (const c of tabs) {
        if (new URL(c.url).pathname.startsWith("/admin") && "focus" in c) {
          try {
            await c.focus();
          } catch {}
          // navigate() only works on a client this worker controls, and can reject
          // (or resolve null) anyway; then just open the page in a window instead.
          const controlled = mine.has(c.id) && "navigate" in c;
          if (controlled) {
            try {
              const nav = await c.navigate(url);
              if (nav) return;
            } catch {}
          }
          return self.clients.openWindow(url);
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});

// The browser rotated or expired this device's push subscription. Re-subscribe with the
// same VAPID key and tell the server (cookies ride along), dropping the old endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      let key = old && old.options && old.options.applicationServerKey;
      if (!key) {
        const res = await fetch("/api/push/", { credentials: "include" });
        const { publicKey } = await res.json();
        const pad = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const raw = atob((publicKey + pad).replace(/-/g, "+").replace(/_/g, "/"));
        key = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
      }
      const sub =
        event.newSubscription ||
        (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      await fetch("/api/push/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (old && old.endpoint && old.endpoint !== sub.endpoint) {
        await fetch("/api/push/", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: old.endpoint }),
        }).catch(() => {});
      }
    })()
  );
});
