import type { Metadata } from "next";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern quotes, orders, payment, artwork rights, and delivery when you work with Kulworks.",
  alternates: { canonical: "/terms/" },
};

export default function TermsPage() {
  const h2 = "mt-8 text-xl font-bold";
  const p = "mt-2 text-muted";
  const email = (
    <a href={`mailto:${site.email}`} className="text-blue hover:underline">
      {site.email}
    </a>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>

      <p className="mt-6 text-muted">
        These Terms of Service (&quot;Terms&quot;) govern your use of {site.name}&apos;s website
        and the products and services we provide (custom card printing, UV-printed tiles, FDM and
        resin 3D printing, and 3D modeling and design). By requesting a quote, placing an order,
        or using this site, you agree to these Terms. If you do not agree, please do not use our
        site or services. Questions? Email us at {email}.
      </p>

      <h2 className={h2}>1. Who we are</h2>
      <p className={p}>
        {site.name} is a maker studio based in San Antonio, Texas. You can reach us at {email} or{" "}
        {site.telephoneDisplay}.
      </p>

      <h2 className={h2}>2. Quotes and orders</h2>
      <p className={p}>
        Quotes are estimates based on the details you provide and are valid for 30 days unless
        stated otherwise. A quote is not a contract until we confirm your order in writing (email
        counts). Pricing may change if your project&apos;s specifications, quantities, materials,
        or artwork change after we quote it. We may decline or cancel any order at our discretion.
      </p>

      <h2 className={h2}>3. Payment, deposits, and taxes</h2>
      <p className={p}>
        Unless otherwise agreed, we may require a deposit before production begins, with the
        balance due before delivery or pickup. We accept the payment methods shown on your invoice
        (which may include PayPal, Venmo, Zelle, or others). A service charge is added to orders
        as shown on your quote or invoice. Invoices are due on the date stated; work and delivery
        may be paused on past-due
        accounts. You are responsible for any fees your payment method charges.
      </p>

      <h2 className={h2}>4. Your artwork and content</h2>
      <p className={p}>
        You are responsible for the files, artwork, text, logos, and other content you provide
        (&quot;Your Content&quot;). By submitting Your Content, you represent and warrant that you
        own it or have all rights and licenses necessary to reproduce it, and that producing it
        does not infringe anyone&apos;s intellectual property, publicity, or privacy rights or
        violate any law. You grant {site.name} a limited license to use, reproduce, and modify
        Your Content solely to produce and deliver your order.
      </p>
      <p className={p}>
        We do not review Your Content for copyright or trademark ownership, and we are not
        responsible for infringement arising from materials you supply. We may refuse or halt any
        project involving content we believe is infringing, unlawful, or objectionable.
      </p>

      <h2 className={h2}>5. Our designs and intellectual property</h2>
      <p className={p}>
        Original designs, artwork, models, and templates that we create remain our property unless
        we agree in writing to transfer them. When your project includes design work, ownership or
        a license to the final deliverables is defined in your quote or order. Our website content,
        branding, and the {site.name} name and logo are our property and may not be used without
        permission.
      </p>

      <h2 className={h2}>6. Proofs and approval</h2>
      <p className={p}>
        For most custom work we provide a proof (digital or physical) for your approval. It is your
        responsibility to review proofs carefully for spelling, layout, color expectations, sizing,
        and content. Once you approve a proof, you are responsible for errors it contained; reprints
        or remakes to fix approved-proof errors are billed as a new order. Printed and screen colors
        can differ, and material, finish, and slight variations are normal in handmade and printed
        goods.
      </p>

      <h2 className={h2}>7. Production time and delays</h2>
      <p className={p}>
        Turnaround times are estimates, not guarantees, and start once we have your approved proof,
        final files, and any required deposit. We are not liable for delays outside our control
        (supplier or shipping delays, equipment issues, or events beyond our reasonable control).
        If we foresee a significant delay, we will let you know.
      </p>

      <h2 className={h2}>8. Shipping, pickup, and risk of loss</h2>
      <p className={p}>
        We offer local delivery/pickup in the San Antonio area and ship finished work within the
        United States. Shipping costs and timelines are estimated and handled by third-party
        carriers. Risk of loss passes to you once an order is delivered to the carrier or picked
        up. We are not responsible for carrier delays, loss, or damage in transit, though we will
        help you file a claim where possible.
      </p>

      <h2 className={h2}>9. Custom goods, changes, cancellations, and refunds</h2>
      <p className={p}>
        Most of what we make is custom or personalized and made to order. Because of this, orders
        generally cannot be canceled once production has begun, and custom items are not eligible
        for return or refund except as required by law. If we make an error or an item arrives
        defective, contact us within 7 days of delivery with photos and we will remake or repair
        the affected items, or issue a refund, at our discretion. Change requests after approval
        may incur additional cost and time.
      </p>

      <h2 className={h2}>10. Acceptable use</h2>
      <p className={p}>
        You agree not to use our site or services to submit content that is illegal, infringing,
        fraudulent, hateful, or that we reasonably find objectionable, and not to attempt to
        disrupt or gain unauthorized access to our systems.
      </p>

      <h2 className={h2}>11. Disclaimer of warranties</h2>
      <p className={p}>
        Our site and services are provided &quot;as is&quot; and &quot;as available.&quot; To the
        fullest extent permitted by law, we disclaim all implied warranties, including
        merchantability and fitness for a particular purpose. We do not warrant that the site will
        be uninterrupted or error-free. This does not limit any remedy for defective goods
        described in Section 9.
      </p>

      <h2 className={h2}>12. Limitation of liability</h2>
      <p className={p}>
        To the fullest extent permitted by law, {site.name} will not be liable for any indirect,
        incidental, special, or consequential damages, or for lost profits or lost data. Our total
        liability for any claim relating to an order will not exceed the amount you paid for that
        order.
      </p>

      <h2 className={h2}>13. Indemnification</h2>
      <p className={p}>
        You agree to indemnify and hold {site.name} harmless from claims, damages, and costs
        (including reasonable attorneys&apos; fees) arising from Your Content or your breach of
        these Terms, including any claim that Your Content infringes a third party&apos;s rights.
      </p>

      <h2 className={h2}>14. Third-party services</h2>
      <p className={p}>
        We rely on third-party providers (for example, payment processors and shipping carriers)
        that have their own terms. We are not responsible for their acts or omissions.
      </p>

      <h2 className={h2}>15. Privacy</h2>
      <p className={p}>
        Our{" "}
        <a href="/privacy/" className="text-blue hover:underline">
          Privacy Policy
        </a>{" "}
        explains how we handle your information and is part of these Terms.
      </p>

      <h2 className={h2}>16. Changes to these Terms</h2>
      <p className={p}>
        We may update these Terms; the &quot;last updated&quot; date above reflects the latest
        version. Continued use of our site or services after changes means you accept the updated
        Terms.
      </p>

      <h2 className={h2}>17. Governing law</h2>
      <p className={p}>
        These Terms are governed by the laws of the State of Texas, without regard to its
        conflict-of-laws rules. Any dispute will be brought in the state or federal courts located
        in Bexar County, Texas, and you consent to their jurisdiction.
      </p>

      <h2 className={h2}>18. Contact</h2>
      <p className={p}>Questions about these Terms? Email {email}.</p>
    </main>
  );
}
