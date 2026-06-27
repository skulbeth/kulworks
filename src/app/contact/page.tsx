import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";
import SocialLinks from "@/components/SocialLinks";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Get a Quote",
  description:
    "Tell Kulworks about your project, whether it's card printing, tiles, 3D printing, or design, and get a quote in San Antonio. We also take projects to game conventions.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <section>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Get a Quote", path: "/contact/" },
        ])}
      />
      <Container className="py-16">
        <SectionHeading
          eyebrow="Get a quote"
          title="Tell me about your project"
          intro="Share the details and I'll come back with next steps and a quote. The more you can tell me about quantities, sizes, and timeline, the faster I can help."
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* Form */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <ContactForm />
          </div>

          {/* Alternate contact / info */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-bold">Other ways to reach me</h3>
              <ul className="mt-3 space-y-2 text-muted">
                {/* TODO: replace with real details */}
                <li>
                  Email:{" "}
                  <a href="mailto:hello@kulworks.com" className="text-blue hover:underline">
                    hello@kulworks.com
                  </a>
                </li>
              </ul>
              <div className="mt-4">
                <p className="text-sm font-semibold">Follow along</p>
                <SocialLinks className="mt-2" />
              </div>
            </div>

            <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6">
              <h3 className="font-bold text-gold">Catch me at a convention</h3>
              <p className="mt-2 text-muted">
                I take projects to game conventions and can even print cards on-site. Going to a
                con? Mention it in your message and we can plan around it.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-bold">What happens next</h3>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
                <li>You send the details.</li>
                <li>I reply with questions, options, and a quote.</li>
                <li>We finalize artwork/files and timeline.</li>
                <li>I make it and get it to you.</li>
              </ol>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
