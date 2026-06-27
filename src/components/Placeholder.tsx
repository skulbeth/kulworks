/**
 * Obvious, swappable image placeholder.
 * Renders a labeled box when no real image is supplied. To use a real image,
 * pass `src` (a file under /public/images/...). See README for the workflow.
 */
export default function Placeholder({
  label,
  src,
  alt,
  className = "",
  ratio = "aspect-[4/3]",
}: {
  label: string;
  src?: string;
  alt?: string;
  className?: string;
  ratio?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt ?? label}
        loading="lazy"
        className={`${ratio} w-full rounded-xl object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${label} (placeholder image)`}
      className={`${ratio} flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface2 ${className}`}
    >
      <div className="px-4 text-center">
        <div className="text-2xl opacity-50">🖼️</div>
        <div className="mt-1 text-sm font-semibold text-muted">{label}</div>
        <div className="text-xs text-muted/60">replace me</div>
      </div>
    </div>
  );
}
