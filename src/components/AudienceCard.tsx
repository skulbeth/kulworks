import Image from "next/image";
import { Audience } from "@/data/audiences";

export default function AudienceCard({ audience }: { audience: Audience }) {
  const inner = (
    <>
      {audience.image ? (
        // Decorative: the title sits right beside it, so no alt text to repeat.
        <Image
          src={audience.image}
          alt=""
          width={160}
          height={160}
          sizes="80px"
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="text-2xl" aria-hidden>
          {audience.icon}
        </div>
      )}
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
