// Switcher between the pages that belong to one area of the admin.
//
// The nav used to carry ten top-level items for a handful of records. These group
// the ones that are really the same job at different stages (an enquiry arriving,
// the work it turns into, the mailing list) without moving any routes: every page
// keeps its own URL, so existing links and bookmarks still work.
import Link from "next/link";

export type SectionTab = { href: string; label: string; count?: number };

export const SECTIONS = {
  inbox: [
    { href: "/admin/submissions/", label: "Submissions" },
    { href: "/admin/uploads/", label: "Uploads" },
  ],
  work: [
    { href: "/admin/projects/", label: "Projects" },
    { href: "/admin/clients/", label: "Clients" },
    { href: "/admin/testimonials/", label: "Testimonials" },
  ],
  newsletter: [
    { href: "/admin/subscribers/", label: "Subscribers" },
    { href: "/admin/newsletter/", label: "Send" },
  ],
} as const;

export default function SectionTabs({
  tabs,
  active,
}: {
  tabs: readonly SectionTab[];
  /** Pathname of the current page, e.g. "/admin/uploads/". */
  active: string;
}) {
  const norm = (p: string) => p.replace(/\/+$/, "");
  return (
    <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1">
      {tabs.map((t) => {
        const on = norm(t.href) === norm(active);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              on ? "bg-primary text-black" : "text-muted hover:text-blue"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1.5 opacity-70">{t.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
