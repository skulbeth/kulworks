// One-off connectivity check: connects via the pooled runtime URL and counts every
// table. Run: npm run db:verify   (safe — read-only, no data written)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [profiles, clients, submissions, subscribers, pageViews] =
    await Promise.all([
      prisma.profile.count(),
      prisma.client.count(),
      prisma.submission.count(),
      prisma.subscriber.count(),
      prisma.pageView.count(),
    ]);
  console.log("✅ DB connection OK. Row counts:", {
    profiles,
    clients,
    submissions,
    subscribers,
    pageViews,
  });
} catch (e) {
  console.error("❌ DB connection FAILED:", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
