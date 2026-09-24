// A row of link "tabs" that filter a list page via a URL search param.
// Server component — each tab is a plain link, so the filter survives refreshes
// and can be bookmarked / shared.
import Link from "next/link";

export type FilterTab = {
  value: string; // search-param value ("" = no param / default view)
  label: string;
  count?: number;
};

export default function FilterTabs({
  basePath,
  param,
  tabs,
  active,
}: {
  basePath: string; // e.g. "/admin/clients/"
  param: string; // e.g. "show"
  tabs: FilterTab[];
  active: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const isActive = t.value === active;
        const href = t.value ? `${basePath}?${param}=${t.value}` : basePath;
        return (
          <Link
            key={t.value || "default"}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              isActive
                ? "bg-primary text-black"
                : "border border-border text-muted hover:border-blue hover:text-blue"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className={isActive ? "ml-1.5 opacity-70" : "ml-1.5 opacity-60"}>
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
