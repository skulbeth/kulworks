import { Audience } from "@/data/audiences";

export default function AudienceCard({ audience }: { audience: Audience }) {
  const inner = (
    <>
      <div className="text-2xl" aria-hidden>
        {audience.icon}
      </div>
      <div>
        <h3 className="font-bold">
          {audience.title}
          {audience.href && <span className="ml-1 text-blue" aria-hidden>↗</span>}
        </h3>
        <p className="mt-1 text-sm text-muted">{audience.blurb}</p>
      </div>
    </>
  );

  const base =
    "flex gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-blue/50";

  if (audience.href) {
    return (
      <a
        href={audience.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} hover:bg-surface2`}
      >
        {inner}
      </a>
    );
  }

  return <div className={base}>{inner}</div>;
}
