"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ExplorerColumn = { key: string; label: string };

export type ExplorerItem = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "neutral" | "green" | "gold" | "blue" | "red";
  search: string; // lowercased searchable text
  cells: Record<string, string>; // keyed by column.key — used for grid + CSV
  detail: ReactNode; // server-rendered expanded content
};

const toneClasses: Record<NonNullable<ExplorerItem["badgeTone"]>, string> = {
  neutral: "bg-surface2 text-muted",
  green: "bg-green-500/15 text-green-600",
  gold: "bg-gold/15 text-gold",
  blue: "bg-blue/15 text-blue",
  red: "bg-red-500/15 text-red-600",
};

function toCsv(columns: ExplorerColumn[], items: ExplorerItem[]): string {
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const header = columns.map((c) => esc(c.label)).join(",");
  const lines = items.map((it) =>
    columns.map((c) => esc(it.cells[c.key] ?? "")).join(",")
  );
  return [header, ...lines].join("\r\n");
}

export default function RecordExplorer({
  columns,
  items,
  filename,
  initialOpenId,
}: {
  columns: ExplorerColumn[];
  items: ExplorerItem[];
  filename: string;
  initialOpenId?: string;
}) {
  const [view, setView] = useState<"cards" | "grid">("cards");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.search.includes(q));
  }, [items, query]);

  function exportCsv() {
    const csv = toCsv(columns, filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm focus:border-blue focus:outline-none"
        />
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => setView("cards")}
            className={`px-3 py-2 text-sm font-semibold ${view === "cards" ? "bg-primary text-black" : "text-muted"}`}
          >
            Cards
          </button>
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-2 text-sm font-semibold ${view === "grid" ? "bg-primary text-black" : "text-muted"}`}
          >
            Grid
          </button>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-blue hover:text-blue"
        >
          Export CSV
        </button>
        <span className="ml-auto text-sm text-muted">
          {filtered.length} of {items.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          Nothing here yet.
        </p>
      ) : view === "cards" ? (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="rounded-xl border border-border bg-surface">
              <button
                onClick={() => toggle(it.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{it.title}</span>
                    {it.badge && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${toneClasses[it.badgeTone ?? "neutral"]}`}
                      >
                        {it.badge}
                      </span>
                    )}
                  </div>
                  {it.subtitle && (
                    <p className="truncate text-sm text-muted">{it.subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 text-muted">{openId === it.id ? "▲" : "▼"}</span>
              </button>
              {openId === it.id && (
                <div className="border-t border-border px-4 py-4 text-sm">{it.detail}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-surface2 text-left text-muted">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-semibold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr
                  key={it.id}
                  className="border-t border-border hover:bg-surface2/50"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 align-top">
                      {it.cells[c.key] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
