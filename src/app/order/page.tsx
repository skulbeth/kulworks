import type { Metadata } from "next";
import Container from "@/components/Container";
import SectionHeading from "@/components/SectionHeading";
import OrderBuilder from "@/components/OrderBuilder";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Design Your Cards",
  description:
    "Pick a card design, fill in your details, and attach your photos. Kulworks prints custom trading cards, player cards, and more in San Antonio.",
  alternates: { canonical: "/order/" },
  // Not linked or indexed yet — placeholder designs. Remove once real designs are in
  // and the page is ready to be linked + added back to the sitemap.
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Design Your Cards", path: "/order/" },
        ])}
      />
      <section className="border-b border-border">
        <Container className="py-16">
          <div className="mx-auto max-w-2xl">
            <SectionHeading
              as="h1"
              eyebrow="Design your cards"
              title="Pick a design and make it yours"
              intro="Choose a card design, fill in the details, and attach your photos. We'll send a proof and a quote before printing. Prefer to just talk it through? Use the regular quote form instead."
            />
            <div className="mt-8">
              <OrderBuilder />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
