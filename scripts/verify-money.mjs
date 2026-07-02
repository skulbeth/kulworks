// Proves payments + reminders work end to end against the DB, then reverts.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const now = new Date();

try {
  const p = await prisma.project.findFirst({
    where: { title: { contains: "Nightfall" } },
    include: { payments: true },
  });
  if (!p) {
    console.log("No demo project — run npm run db:seed first.");
    process.exit(1);
  }

  const before = p.payments.reduce((s, x) => s + x.amount, 0);
  const pay = await prisma.payment.create({
    data: { projectId: p.id, amount: 100, method: "CASH", note: "verify" },
  });
  const after = (
    await prisma.payment.aggregate({ where: { projectId: p.id }, _sum: { amount: true } })
  )._sum.amount;
  console.log(`✅ payment logged (CASH $100): total $${before} → $${after}`);

  const rem = await prisma.activity.create({
    data: {
      type: "REMINDER",
      body: "verify reminder",
      remindAt: new Date(now.getTime() + 86400000),
      projectId: p.id,
    },
  });
  const open1 = await prisma.activity.count({
    where: { type: "REMINDER", done: false, remindAt: { not: null } },
  });
  await prisma.activity.update({ where: { id: rem.id }, data: { done: true } });
  const open2 = await prisma.activity.count({
    where: { type: "REMINDER", done: false, remindAt: { not: null } },
  });
  console.log(`✅ reminder open count: ${open1} → ${open2} after marking done`);

  await prisma.payment.delete({ where: { id: pay.id } });
  await prisma.activity.delete({ where: { id: rem.id } });
  console.log("↩️  reverted test rows");
} finally {
  await prisma.$disconnect();
}
