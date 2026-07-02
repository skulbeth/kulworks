import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const real = await p.pageView.findMany({
    where: { NOT: { sessionId: { startsWith: "demo-sess" } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const demo = await p.pageView.count({ where: { sessionId: { startsWith: "demo-sess" } } });
  console.log(`REAL visits logged: ${real.length} | demo visits: ${demo}`);
  for (const v of real) {
    console.log(`  • ${v.path} | device: ${v.device} | ${v.country ?? "(local/none)"} | ${v.createdAt.toISOString().slice(0, 16)}`);
  }
} finally {
  await p.$disconnect();
}
