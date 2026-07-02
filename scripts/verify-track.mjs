// Confirms the tracker wrote exactly the human visit (bot skipped), then cleans up.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const rows = await prisma.pageView.findMany({ where: { path: "/e2e-track-test" } });
  console.log(`page views for /e2e-track-test: ${rows.length} (expect 1 — bot filtered)`);
  rows.forEach((r) =>
    console.log(`  device=${r.device} referrer=${r.referrer} session=${r.sessionId}`)
  );
  const del = await prisma.pageView.deleteMany({ where: { path: "/e2e-track-test" } });
  console.log(`🧹 cleaned ${del.count} test row(s)`);
} finally {
  await prisma.$disconnect();
}
