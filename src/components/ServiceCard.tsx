import Link from "next/link";
import { Service } from "@/data/services";

/** Service card used on the home grid and the Services page. */
export default function ServiceCard({
  service,
  featured = false,
}: {
  service: Service;
  featured?: boolean;
}) {
  return (
    <div
      className={`group flex h-full flex-col rounded-2xl border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-hover ${
        featured ? "border-gold/50" : "border-border hover:border-blue/50"
      }`}
    >
      {featured && (
        <span className="mb-3 inline-block w-fit rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">
          Lead Service
        </span>
      )}
      <div className="text-4xl">{service.icon}</div>
      <h3 className="mt-4 text-xl font-bold">{service.name}</h3>
      <p className="mt-1 text-sm font-semibold text-gold">{service.tagline}</p>
      <p className="mt-3 flex-1 text-muted">{service.description}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {service.id === "card-printing" && (
          <Link
            href="/services/card-printing/"
            className="inline-flex items-center gap-1 text-sm font-bold text-gold transition-transform group-hover:gap-2"
          >
            Explore card printing →
          </Link>
        )}
        <Link
          href={`/contact/?type=${service.id}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue transition-transform group-hover:gap-2"
        >
          Request this →
        </Link>
      </div>
    </div>
  );
}
