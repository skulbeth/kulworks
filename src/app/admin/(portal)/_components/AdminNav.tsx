"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

// Ten top-level items for a handful of records was a lot of nav. Related pages are
// grouped now: the nav links to the first page of each group and stays highlighted
// across its siblings, and a SectionTabs switcher on those pages moves between them.
// Routes are unchanged, so old links and bookmarks still work.
const tabs: { href: string; label: string; siblings?: string[] }[] = [
  { href: "/admin/", label: "Dashboard" },
  { href: "/admin/submissions/", label: "Inbox", siblings: ["/admin/uploads"] },
  { href: "/admin/projects/", label: "Work", siblings: ["/admin/clients", "/admin/testimonials"] },
  { href: "/admin/subscribers/", label: "Newsletter", siblings: ["/admin/newsletter"] },
  { href: "/admin/analytics/", label: "Analytics" },
  { href: "/admin/team/", label: "Team" },
  { href: "/admin/archive/", label: "Archive" },
];

const norm = (p: string) => p.replace(/\/+$/, "") || "/";

export default function AdminNav({ email, role, unread = 0 }: { email: string; role: string; unread?: number }) {
  const pathname = usePathname() ?? "/admin";
  const p = norm(pathname);
  const router = useRouter();

  // A push arriving while the admin is open refreshes the bell count; the app-icon
  // dot clears once everything has been read.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "kulworks-push") router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [router]);
  useEffect(() => {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    if (unread === 0) nav.clearAppBadge?.().catch(() => {});
  }, [unread]);

  const isActive = (href: string, siblings: string[] = []) => {
    const h = norm(href);
    if (h === "/admin") return p === "/admin";
    const hit = (x: string) => p === norm(x) || p.startsWith(norm(x) + "/");
    return hit(h) || siblings.some(hit);
  };

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-bold">Kulworks Admin</span>
        <nav className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive(t.href, t.siblings)
                  ? "bg-primary text-black"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-muted">
          <Link
            href="/admin/notifications/"
            title={unread ? `${unread} new notification${unread === 1 ? "" : "s"}` : "Notifications"}
            className={`relative flex items-center rounded-full border px-2.5 py-1.5 font-semibold hover:border-blue hover:text-blue ${
              p.startsWith("/admin/notifications") ? "border-blue text-blue" : "border-border"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] font-black leading-5 text-black">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <Link
            href="/"
            title="Go to the main site"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-semibold hover:border-blue hover:text-blue"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9.5 21v-6h5v6" />
            </svg>
            <span className="hidden sm:inline">View site</span>
          </Link>
          <ThemeToggle />
          <span className="hidden sm:inline">
            {email}
            {role === "OWNER" ? " · Owner" : ""}
          </span>
          <form action="/admin/logout/" method="post">
            <button className="rounded-full border border-border px-3 py-1.5 font-semibold hover:border-blue hover:text-blue">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
