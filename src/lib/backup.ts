// Builds a full JSON export of the business data (for backups / peace of mind).
// Every table holding real records is in here. Left out on purpose: TwoFactorCode and
// RateLimit (short-lived), PushDevice (only means something to that phone), and the
// Setting rows that hold keys.
import { prisma } from "@/lib/prisma";

const SECRET_SETTINGS = ["vapid_keys"];

export async function buildBackup() {
  const [
    clients,
    submissions,
    projects,
    payments,
    activities,
    subscribers,
    profiles,
    invoices,
    invoiceItems,
    proofs,
    proofItems,
    proofComments,
    uploads,
    testimonials,
    notifications,
    settings,
    auditLogs,
    errorLogs,
    pageViews,
  ] = await Promise.all([
    prisma.client.findMany(),
    prisma.submission.findMany(),
    prisma.project.findMany(),
    prisma.payment.findMany(),
    prisma.activity.findMany(),
    prisma.subscriber.findMany(),
    prisma.profile.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.proof.findMany(),
    prisma.proofItem.findMany(),
    prisma.proofComment.findMany(),
    prisma.upload.findMany(),
    prisma.testimonial.findMany(),
    prisma.notification.findMany(),
    prisma.setting.findMany({ where: { key: { notIn: SECRET_SETTINGS } } }),
    prisma.auditLog.findMany(),
    prisma.errorLog.findMany(),
    prisma.pageView.findMany(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    clients,
    submissions,
    projects,
    payments,
    activities,
    subscribers,
    profiles,
    invoices,
    invoiceItems,
    proofs,
    proofItems,
    proofComments,
    uploads,
    testimonials,
    notifications,
    settings,
    auditLogs,
    errorLogs,
    pageViews,
  };
  const json = JSON.stringify(data, null, 2);
  const filename = `kulworks-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const counts = {
    clients: clients.length,
    submissions: submissions.length,
    projects: projects.length,
    payments: payments.length,
    activities: activities.length,
    subscribers: subscribers.length,
    invoices: invoices.length,
    proofs: proofs.length,
    uploads: uploads.length,
    testimonials: testimonials.length,
    pageViews: pageViews.length,
  };
  return { json, filename, counts };
}
