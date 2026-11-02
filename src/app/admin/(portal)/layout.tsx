import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { maybeSweepInbox } from "@/lib/inbox-sweep";
import AdminNav from "./_components/AdminNav";
import IdleLogout from "./_components/IdleLogout";

// The admin portal is never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Admin",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guards every page in this group: no session → redirect to login.
  // Also bootstraps the Profile row on first login.
  const { profile } = await requireProfile();
  const unread = await prisma.notification.count({ where: { readAt: null } });
  // Opening the admin/app checks the inbox for client emails and payment receipts.
  after(() => maybeSweepInbox());

  return (
    <div className="min-h-screen bg-background">
      <IdleLogout />
      <AdminNav email={profile.email} role={profile.role} unread={unread} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
