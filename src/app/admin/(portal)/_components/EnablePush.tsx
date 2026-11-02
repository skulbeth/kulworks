"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// "Turn on notifications on this device": registers the admin service worker,
// asks for permission, subscribes with the server's VAPID key and saves it.
// Works the same in the Android app (Chrome underneath) and any desktop browser.

function b64ToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

// Save this device's subscription on the server (upsert by endpoint, so re-sending is safe).
async function saveSub(sub: PushSubscription) {
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return fetch("/api/push/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), label: standalone ? "Android app" : undefined }),
  });
}

type State = "checking" | "unsupported" | "denied" | "off" | "on" | "working";

export default function EnablePush({ vapidPublicKey }: { vapidPublicKey: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/admin/" });
      let sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        const key = b64ToBytes(vapidPublicKey);
        // Subscribed under an older VAPID key: the server can't reach it. Start fresh.
        if (!sameKey(sub.options.applicationServerKey, key)) {
          await fetch("/api/push/", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          }).catch(() => {});
          await sub.unsubscribe().catch(() => false);
          sub = await reg.pushManager
            .subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource })
            .catch(() => null);
        }
        // Re-send it every visit so a device the server pruned heals itself.
        if (sub) await saveSub(sub).catch(() => {});
      }
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapidPublicKey]);

  const turnOn = async () => {
    setErr(null);
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/admin/" });
      await navigator.serviceWorker.ready;
      const key = b64ToBytes(vapidPublicKey);
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub.options.applicationServerKey, key)) {
        await sub.unsubscribe().catch(() => false);
        sub = null;
      }
      sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
      const res = await saveSub(sub);
      if (!res.ok) throw new Error(`Server said ${res.status}`);
      setState("on");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setState("off");
    }
  };

  const turnOff = async () => {
    setState("working");
    const reg = await navigator.serviceWorker.getRegistration("/admin/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
    router.refresh();
  };

  const btn = "rounded-full px-4 py-2 text-sm font-bold";
  return (
    <div className="rounded-xl border border-border bg-surface2 p-4">
      <p className="font-semibold">This device</p>
      {state === "checking" && <p className="text-sm text-muted">Checking...</p>}
      {state === "unsupported" && (
        <p className="text-sm text-muted">This browser can&apos;t do push notifications. Use the Kulworks app or Chrome.</p>
      )}
      {state === "denied" && (
        <p className="text-sm text-muted">
          Notifications are blocked for this site. Allow them in the app/browser settings (Site settings &gt; Notifications), then reload.
        </p>
      )}
      {(state === "off" || state === "working") && (
        <button onClick={turnOn} disabled={state === "working"} className={`${btn} mt-2 bg-primary text-black disabled:opacity-60`}>
          {state === "working" ? "Turning on..." : "Turn on notifications on this device"}
        </button>
      )}
      {state === "on" && (
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-green-600">Notifications are on here.</span>
          <button onClick={turnOff} className={`${btn} border border-border`}>Turn off</button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-600">Couldn&apos;t turn on: {err}</p>}
    </div>
  );
}
