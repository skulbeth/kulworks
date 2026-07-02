// Proves the edit data-layer works: mutate a demo project + add activity, then revert.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

try {
  const p = await prisma.project.findFirst({
    where: { title: { contains: "Nightfall" } },
  });
  if (!p) {
    console.log("No demo project found — run npm run db:seed first.");
    process.exit(1);
  }

  const before = { stage: p.stage, finalAmount: p.finalAmount };
  await prisma.project.update({
    where: { id: p.id },
    data: { stage: "DELIVERED", finalAmount: 1900 },
  });
  const after = await prisma.project.findUnique({ where: { id: p.id } });
  console.log(`✅ update: stage ${before.stage} → ${after.stage}, final ${before.finalAmount} → ${after.finalAmount}`);

  const a = await prisma.activity.create({
    data: { type: "NOTE", body: "round-trip test", projectId: p.id },
  });
  const cnt = await prisma.activity.count({ where: { projectId: p.id } });
  console.log(`✅ activity added — project now has ${cnt}`);

  // revert
  await prisma.project.update({ where: { id: p.id }, data: before });
  await prisma.activity.delete({ where: { id: a.id } });
  console.log("↩️  reverted to original state");
} finally {
  await prisma.$disconnect();
}
