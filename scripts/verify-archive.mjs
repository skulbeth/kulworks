// Verifies soft-delete → archive query → restore, and audit-log writes. Cleans up.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const s = await p.submission.create({
    data: { name: "ArchiveTest", email: "arch@example.com", message: "x", status: "NEW" },
  });
  await p.submission.update({ where: { id: s.id }, data: { deletedAt: new Date() } });
  const archived = await p.submission.count({ where: { id: s.id, deletedAt: { not: null } } });
  await p.submission.update({ where: { id: s.id }, data: { deletedAt: null } });
  const restored = await p.submission.count({ where: { id: s.id, deletedAt: null } });
  console.log(`archive shows it: ${archived === 1 ? "✅" : "❌"} | restore clears it: ${restored === 1 ? "✅" : "❌"}`);

  const a = await p.auditLog.create({
    data: { actorEmail: "test@x.com", action: "test.action", detail: "verify" },
  });
  const found = await p.auditLog.count({ where: { id: a.id } });
  console.log(`audit log writes: ${found === 1 ? "✅" : "❌"}`);

  await p.submission.delete({ where: { id: s.id } });
  await p.auditLog.delete({ where: { id: a.id } });
  console.log("🧹 cleaned");
} finally {
  await p.$disconnect();
}
