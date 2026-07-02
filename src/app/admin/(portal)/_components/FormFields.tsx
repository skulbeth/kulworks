// Presentational form fields (server components — plain HTML, no client JS needed).
// Used by the project + client edit forms, which submit to server actions.
import type { ReactNode } from "react";

const inputCls =
  "w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-foreground focus:border-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-muted";

export function TextField({
  name, label, defaultValue, placeholder,
}: { name: string; label: string; defaultValue?: string | null; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={inputCls} />
    </label>
  );
}

export function TextArea({
  name, label, defaultValue, rows = 3,
}: { name: string; label: string; defaultValue?: string | null; rows?: number }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} className={inputCls} />
    </label>
  );
}

export function NumberField({
  name, label, defaultValue, step,
}: { name: string; label: string; defaultValue?: number | null; step?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="number"
        name={name}
        step={step}
        defaultValue={defaultValue ?? ""}
        className={inputCls}
      />
    </label>
  );
}

export function DateField({
  name, label, defaultValue,
}: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input type="date" name={name} defaultValue={defaultValue ?? ""} className={inputCls} />
    </label>
  );
}

export function SelectField({
  name, label, defaultValue, options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select name={name} defaultValue={defaultValue} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-bold">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}
