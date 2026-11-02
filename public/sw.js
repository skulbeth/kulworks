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
      for (const c of tabs) {
        if (new URL(c.url).pathname.startsWith("/admin") && "focus" in c) {
          await c.focus();
          if ("navigate" in c) return c.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
