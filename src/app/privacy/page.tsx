import type { Metadata } from "next";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Kulworks collects, uses, and protects your information.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  const h2 = "mt-8 text-xl font-bold";
  const p = "mt-2 text-muted";

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>

      <p className="mt-6 text-muted">
        This policy explains what {site.name} collects, why, and your choices. Questions?
        Email us at{" "}
        <a href={`mailto:${site.email}`} className="text-blue hover:underline">
          {site.email}
        </a>
        .
      </p>

      <h2 className={h2}>Information we collect</h2>
      <p className={p}>
        <strong>Information you give us:</strong> when you request a quote or contact us: your
        name, email, project details, any reference links you share, and (if you provide it) a
        shipping/mailing address. If you subscribe to our newsletter, your email address.
      </p>
      <p className={p}>
        <strong>Information collected automatically:</strong> we use privacy-friendly,
        cookieless analytics to understand site usage: pages viewed, approximate location
        (city/country), device type, and the referring site. We do not use tracking cookies or
        cross-site advertising trackers.
      </p>

      <h2 className={h2}>How we use it</h2>
      <p className={p}>
        To respond to your requests and prepare quotes, provide and deliver our services, send
        transactional emails (like quote confirmations), send our newsletter if you opted in,
        and improve our website.
      </p>

      <h2 className={h2}>How we share it</h2>
      <p className={p}>
        We do not sell your personal information. We share it only with service providers that
        help us operate, under their own privacy terms: <strong>Supabase</strong> (database &amp;
        login hosting), <strong>Resend</strong> (email delivery), and <strong>Vercel</strong>{" "}
        (website hosting). If you make a payment, the relevant payment provider processes it.
      </p>

      <h2 className={h2}>Email &amp; your choices</h2>
      <p className={p}>
        Transactional emails (e.g., quote confirmations) are part of providing our service. Our
        newsletter is opt-in, and every newsletter includes an unsubscribe link, so you can opt
        out at any time. You may also request access to, correction of, or deletion of your
        information by emailing{" "}
        <a href={`mailto:${site.email}`} className="text-blue hover:underline">
          {site.email}
        </a>
        .
      </p>

      <h2 className={h2}>Data retention</h2>
      <p className={p}>
        We keep your information for as long as needed to serve you and run our business, then
        archive or remove it. Contact us to request deletion.
      </p>

      <h2 className={h2}>Children</h2>
      <p className={p}>Our site and services are not directed to children under 13.</p>

      <h2 className={h2}>Changes</h2>
      <p className={p}>
        We may update this policy; the &quot;last updated&quot; date above reflects the latest
        version.
      </p>
    </main>
  );
}
