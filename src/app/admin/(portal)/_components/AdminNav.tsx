"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const tabs = [
  { href: "/admin/", label: "Dashboard" },
  { href: "/admin/submissions/", label: "Submissions" },
  { href: "/admin/projects/", label: "Projects" },
  { href: "/admin/clients/", label: "Clients" },
  { href: "/admin/subscribers/", label: "Subscribers" },
  { href: "/admin/newsletter/", label: "Newsletter" },
  { href: "/admin/analytics/", label: "Analytics" },
  { href: "/admin/team/", label: "Team" },
  { href: "/admin/archive/", label: "Archive" },
];

const norm = (p: string) => p.replace(/\/+$/, "") || "/";

export default function AdminNav({ email, role }: { email: string; role: string }) {
  const pathname = usePathname() ?? "/admin";
  const p = norm(pathname);

  const isActive = (href: string) => {
    const h = norm(href);
    if (h === "/admin") return p === "/admin";
    return p === h || p.startsWith(h + "/");
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
                isActive(t.href)
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
