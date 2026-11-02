// Small display formatters used across the admin portal.

const DASH = "-";

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return DASH;
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// The shop's clock. Server code runs in UTC, so a moment in time (a click, a view,
// a log line) must say which day and hour it was in Texas, not in London.
export const SHOP_TZ = "America/Chicago";

// The Texas day of a moment in time. Not for date-only fields (due dates and the
// like are stored as midnight and go through fmtDate).
export function fmtDay(d: Date | null | undefined): string {
  if (!d) return DASH;
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return DASH;
  return new Date(d).toLocaleString("en-US", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return DASH;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtText(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return DASH;
  return String(v);
}

// For <input type="date"> value: "yyyy-mm-dd" (or "" when empty).
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
}
