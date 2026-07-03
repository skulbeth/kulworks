// Tests whether deleting a Profile that authored an Activity works (removeAdmin's risk).
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const prof = await p.profile.create({
    data: { id: "fk-test-profile", email: "fktest@example.com", role: "STAFF" },
  });
  const act = await p.activity.create({
    data: { type: "NOTE", body: "fk test", authorId: prof.id },
  });
  try {
    await p.profile.delete({ where: { id: prof.id } });
    const a = await p.activity.findUnique({ where: { id: act.id } });
    console.log(
      `RESULT: profile delete SUCCEEDED — activity.authorId is now ${a ? JSON.stringify(a.authorId) : "(activity gone)"}`
    );
  } catch (e) {
    console.log(`RESULT: profile delete FAILED → ${String(e.message).split("\n")[0]}`);
  }
  await p.activity.deleteMany({ where: { id: act.id } });
  await p.profile.deleteMany({ where: { id: "fk-test-profile" } });
  console.log("cleaned up");
} finally {
  await p.$disconnect();
}
