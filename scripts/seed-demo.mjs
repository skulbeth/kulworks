// Seeds clearly-marked DEMO data so the admin portal isn't empty while you explore.
// All demo contacts use "@demo.test" emails so they're easy to remove.
//   Seed:   npm run db:seed
//   Remove: npm run db:seed -- --clean
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const clean = process.argv.includes("--clean");

const day = 24 * 60 * 60 * 1000;
const now = new Date();
const inDays = (n) => new Date(now.getTime() + n * day);

try {
  if (clean) {
    // Delete demo projects/activities/submissions/clients (by @demo.test email).
    const demoClients = await prisma.client.findMany({
      where: { email: { endsWith: "@demo.test" } },
      select: { id: true },
    });
    const ids = demoClients.map((c) => c.id);
    await prisma.activity.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.activity.deleteMany({
      where: { project: { clientId: { in: ids } } },
    });
    await prisma.submission.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { project: { clientId: { in: ids } } } });
    await prisma.project.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.client.deleteMany({ where: { id: { in: ids } } });
    await prisma.pageView.deleteMany({ where: { sessionId: { startsWith: "demo-sess" } } });
    await prisma.subscriber.deleteMany({ where: { email: { endsWith: "@demo.test" } } });
    // Unattached demo reminder (no client/project link, so not caught above).
    await prisma.activity.deleteMany({
      where: { type: "REMINDER", body: "Order more matte cardstock" },
    });
    console.log(`🧹 Removed demo data for ${ids.length} demo client(s) + demo page views + subscribers.`);
    process.exit(0);
  }

  const ava = await prisma.client.create({
    data: {
      name: "Ava Chen",
      email: "ava@demo.test",
      phone: "210-555-0142",
      company: "Nightfall Games",
      city: "San Antonio",
      state: "TX",
      notes: "Indie tabletop designer. Prefers matte finish.",
    },
  });
  const leo = await prisma.client.create({
    data: {
      name: "Leo Martinez",
      email: "leo@demo.test",
      phone: "512-555-0199",
      city: "Austin",
      state: "TX",
    },
  });
  const priya = await prisma.client.create({
    data: {
      name: "Priya Shah",
      email: "priya@demo.test",
      company: "Shah Tarot",
      city: "Dallas",
      state: "TX",
    },
  });

  await prisma.submission.create({
    data: {
      name: "Ava Chen",
      email: "ava@demo.test",
      projectType: "card-printing, card-design",
      message: "Need 500 poker decks for a Kickstarter, matte finish, custom box.",
      driveFolder: true,
      status: "QUOTED",
      sessionId: "demo-sess-ava",
      clientId: ava.id,
    },
  });
  await prisma.submission.create({
    data: {
      name: "Leo Martinez",
      email: "leo@demo.test",
      projectType: "3d-printing",
      message: "Resin miniatures — 20 pieces, high detail.",
      status: "NEW",
      clientId: leo.id,
    },
  });

  const p1 = await prisma.project.create({
    data: {
      title: "Nightfall — 500 poker decks",
      stage: "IN_PRODUCTION",
      clientId: ava.id,
      requested: "500 poker-size decks, matte, custom 3D-printed boxes.",
      deliverables: "Print, cut, box, and ship 500 decks.",
      cardCount: 54,
      cardSize: "Poker",
      quantity: 500,
      finish: "Matte",
      quotedAmount: 1850,
      finalAmount: 1850,
      materialCost: 720,
      devHours: 6,
      dueDate: inDays(9),
      startDate: inDays(-5),
      shipStreet: "12 Maker Way",
      shipCity: "San Antonio",
      shipState: "TX",
      shipPostalCode: "78205",
    },
  });
  const p2 = await prisma.project.create({
    data: {
      title: "Shah Tarot — 78-card deck",
      stage: "QUOTED",
      clientId: priya.id,
      requested: "Tarot-size 78-card deck, glossy, 250 units.",
      cardCount: 78,
      cardSize: "Tarot",
      quantity: 250,
      finish: "Glossy",
      quotedAmount: 1400,
      dueDate: inDays(21),
    },
  });
  await prisma.project.create({
    data: {
      title: "Leo — resin miniatures",
      stage: "LEAD",
      clientId: leo.id,
      requested: "20 high-detail resin miniatures.",
      dueDate: inDays(3),
    },
  });

  await prisma.activity.createMany({
    data: [
      { type: "EMAIL_SENT", body: "Sent quote + timeline.", projectId: p1.id, clientId: ava.id },
      { type: "STATUS_CHANGE", body: "Moved to In Production.", projectId: p1.id },
      { type: "NOTE", body: "Waiting on final artwork approval.", projectId: p2.id, clientId: priya.id },
      // Reminders (open) — one upcoming, one overdue.
      { type: "REMINDER", body: "Follow up with Priya on artwork approval", remindAt: inDays(2), projectId: p2.id, clientId: priya.id },
      { type: "REMINDER", body: "Order more matte cardstock", remindAt: inDays(-1) },
    ],
  });

  await prisma.payment.createMany({
    data: [
      { projectId: p1.id, amount: 925, method: "ZELLE", note: "50% deposit" },
      { projectId: p1.id, amount: 200, method: "CARD", note: "partial" },
    ],
  });

  // Demo page views (Ava's session leads into her submission → shows a "journey").
  await prisma.pageView.createMany({
    data: [
      { path: "/", device: "desktop", sessionId: "demo-sess-ava", referrer: "https://www.google.com/", createdAt: inDays(-2) },
      { path: "/pricing/", device: "desktop", sessionId: "demo-sess-ava", createdAt: inDays(-2) },
      { path: "/services/card-printing/", device: "desktop", sessionId: "demo-sess-ava", createdAt: inDays(-2) },
      { path: "/contact/", device: "desktop", sessionId: "demo-sess-ava", createdAt: inDays(-2) },
      { path: "/", device: "mobile", sessionId: "demo-sess-2", referrer: "https://www.facebook.com/", createdAt: inDays(-1) },
      { path: "/portfolio/", device: "mobile", sessionId: "demo-sess-2", createdAt: inDays(-1) },
      { path: "/", device: "desktop", sessionId: "demo-sess-3", createdAt: inDays(0) },
      { path: "/pricing/", device: "desktop", sessionId: "demo-sess-3", createdAt: inDays(0) },
    ],
  });

  await prisma.subscriber.createMany({
    data: [
      { email: "fan1@demo.test", source: "footer" },
      { email: "fan2@demo.test", source: "footer" },
    ],
  });

  console.log("✅ Seeded demo data (clients, submissions, projects, activities, payments, reminders, page views, subscribers).");
  console.log("   Remove anytime with:  npm run db:seed -- --clean");
} finally {
  await prisma.$disconnect();
}
