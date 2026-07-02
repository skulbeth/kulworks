// Confirms subscribe dedupe + honeypot behavior, then cleans up test rows.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const good = await prisma.subscriber.count({ where: { email: "e2e-sub@example.com" } });
  const bot = await prisma.subscriber.count({ where: { email: "bot-sub@example.com" } });
  console.log(`valid subscriber rows: ${good} (expect 1 — deduped)`);
  console.log(`honeypot bot rows: ${bot} (expect 0)`);
  const del = await prisma.subscriber.deleteMany({
    where: { email: { in: ["e2e-sub@example.com", "bot-sub@example.com"] } },
  });
  console.log(`🧹 cleaned ${del.count} test row(s)`);
} finally {
  await prisma.$disconnect();
}
