"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import PageTracker from "@/components/PageTracker";

// Wraps page content with the marketing Header/Footer — except on the /admin
// portal, which has its own chrome. Header/Footer are rendered on the server and
// passed in as props so this client component can conditionally include them.
export default function SiteFrame({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The /admin portal and the customer-facing /invoice pages have no marketing chrome.
  const bare =
    (pathname?.startsWith("/admin") ?? false) || (pathname?.startsWith("/invoice") ?? false);

  if (bare) return <>{children}</>;

  return (
    <>
      <PageTracker />
      {header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {footer}
    </>
  );
}
