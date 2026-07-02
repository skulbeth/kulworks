// Builds a full JSON export of the business data (for backups / peace of mind).
import { prisma } from "@/lib/prisma";

export async function buildBackup() {
  const [clients, submissions, projects, payments, activities, subscribers, profiles] =
    await Promise.all([
      prisma.client.findMany(),
      prisma.submission.findMany(),
      prisma.project.findMany(),
      prisma.payment.findMany(),
      prisma.activity.findMany(),
      prisma.subscriber.findMany(),
      prisma.profile.findMany(),
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
  };
  return { json, filename, counts };
}
