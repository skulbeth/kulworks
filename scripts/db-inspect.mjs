// Inspect current submissions + clients. With `--clean-tests` it deletes rows whose
// email looks like our automated tests (e2e-test@ / @spam.com / @example.com).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const clean = process.argv.includes("--clean-tests");

try {
  if (clean) {
    const emails = ["e2e-test@example.com", "bot@spam.com"];
    const s = await prisma.submission.deleteMany({ where: { email: { in: emails } } });
    const c = await prisma.client.deleteMany({ where: { email: { in: emails } } });
    console.log(`🧹 Deleted ${s.count} test submission(s), ${c.count} test client(s).`);
  }

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });
  const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });

  console.log(`\n=== SUBMISSIONS (${submissions.length}) ===`);
  for (const s of submissions) {
    console.log(
      `- ${s.name} <${s.email}> | type="${s.projectType}" | drive=${s.driveFolder} | status=${s.status} | clientId=${s.clientId}`
    );
  }
  console.log(`\n=== CLIENTS (${clients.length}) ===`);
  for (const c of clients) {
    console.log(`- ${c.name} <${c.email}> | id=${c.id}`);
  }
} finally {
  await prisma.$disconnect();
}
