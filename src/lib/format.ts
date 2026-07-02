// Small display formatters used across the admin portal.

const DASH = "—";

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return DASH;
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return DASH;
  return new Date(d).toLocaleString("en-US", {
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
