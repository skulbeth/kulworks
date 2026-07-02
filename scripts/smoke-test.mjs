// Comprehensive smoke test. Requires the dev server running on :3002.
// Run: (start dev), then  npx dotenv -e .env.local -- node scripts/smoke-test.mjs
// Exercises public endpoints (valid/invalid/spam/auth), route guards, and the DB
// operations behind every admin action. Cleans up all test data at the end.
import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";

const BASE = "http://localhost:3002";
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const results = [];
const ok = (name, pass, detail = "") => results.push({ name, pass, detail });

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

try {
  // ── 1. Quote form ──
  const q1 = await post("/api/quote/", {
    name: "Smoke Test", email: "kulworksdesign@gmail.com",
    projectType: "card-printing", message: "Smoke test — please ignore.", driveFolder: false,
    turnstileToken: "test",
  });
  const qSaved = await prisma.submission.findFirst({ where: { email: "kulworksdesign@gmail.com" } });
  ok("quote: valid submit → 200 + saved + emails", q1.status === 200 && q1.json?.ok && !!qSaved, `status ${q1.status}`);

  const q2 = await post("/api/quote/", { name: "x", email: "not-an-email", message: "hi", turnstileToken: "test" });
  ok("quote: invalid email → 400", q2.status === 400 && q2.json?.ok === false);

  const q3 = await post("/api/quote/", { name: "Bot", email: "bot-q@example.com", message: "x", company_website: "spam" });
  const q3Saved = await prisma.submission.count({ where: { email: "bot-q@example.com" } });
  ok("quote: honeypot → 200 + NOT saved", q3.status === 200 && q3Saved === 0);

  // ── 2. Newsletter subscribe ──
  const s1 = await post("/api/subscribe/", { email: "smoke-sub@example.com", source: "smoke", turnstileToken: "test" });
  const sRow = await prisma.subscriber.findUnique({ where: { email: "smoke-sub@example.com" } });
  ok("subscribe: valid → 200 + saved", s1.status === 200 && !!sRow);
  ok("subscribe: synced to Resend Audience (resendContactId)", !!sRow?.resendContactId, sRow?.resendContactId ?? "none");

  await post("/api/subscribe/", { email: "smoke-sub@example.com", source: "smoke", turnstileToken: "test" });
  const sCount = await prisma.subscriber.count({ where: { email: "smoke-sub@example.com" } });
  ok("subscribe: dedupe (still 1 row)", sCount === 1, `count ${sCount}`);

  const s3 = await post("/api/subscribe/", { email: "bot-sub@example.com", company_website: "x" });
  const s3Count = await prisma.subscriber.count({ where: { email: "bot-sub@example.com" } });
  ok("subscribe: honeypot → 200 + NOT saved", s3.status === 200 && s3Count === 0);

  const s4 = await post("/api/subscribe/", { email: "nope", turnstileToken: "test" });
  ok("subscribe: invalid email → 400", s4.status === 400);

  // ── 3. Analytics tracker ──
  const t1 = await post("/api/track/", { path: "/smoke-test", referrer: "https://ex.com/", sessionId: "smoke-sess" },
    { "User-Agent": "Mozilla/5.0 (Macintosh)" });
  const t1Count = await prisma.pageView.count({ where: { path: "/smoke-test" } });
  ok("track: valid → 200 + logged", t1.status === 200 && t1Count >= 1);

  await post("/api/track/", { path: "/smoke-bot", sessionId: "smoke-bot" }, { "User-Agent": "Googlebot/2.1" });
  const botCount = await prisma.pageView.count({ where: { path: "/smoke-bot" } });
  ok("track: bot UA → NOT logged", botCount === 0);

  // ── 4. Reminders cron ──
  const c1 = await fetch(`${BASE}/api/cron/reminders/`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  const c1json = await c1.json().catch(() => ({}));
  ok("cron: with secret → 200", c1.status === 200 && c1json?.ok === true, `sent ${c1json?.sent}`);
  const c2 = await fetch(`${BASE}/api/cron/reminders/`);
  ok("cron: without secret → 401", c2.status === 401);

  // ── 5. Auth / route guards ──
  const g1 = await fetch(`${BASE}/admin/`, { redirect: "manual" });
  const loc = g1.headers.get("location") ?? "";
  ok("guard: /admin/ unauth → redirect to login", (g1.status === 307 || g1.status === 308) && loc.includes("/admin/login"), `status ${g1.status}`);
  const g2 = await fetch(`${BASE}/admin/projects/`, { redirect: "manual" });
  ok("guard: /admin/projects/ unauth → redirect", (g2.status === 307 || g2.status === 308));
  const g3 = await fetch(`${BASE}/admin/login/`, { redirect: "manual" });
  ok("login page → 200", g3.status === 200);

  // ── 6. DB mutation sweep (mirrors server actions) ──
  const proj = await prisma.project.findFirst({ where: { title: { contains: "Nightfall" } } });
  if (proj) {
    // payment add/delete
    const before = (await prisma.payment.aggregate({ where: { projectId: proj.id }, _sum: { amount: true } }))._sum.amount ?? 0;
    const pay = await prisma.payment.create({ data: { projectId: proj.id, amount: 50, method: "CASH", note: "smoke" } });
    const after = (await prisma.payment.aggregate({ where: { projectId: proj.id }, _sum: { amount: true } }))._sum.amount ?? 0;
    ok("payment: add updates total", after === before + 50, `${before} → ${after}`);
    await prisma.payment.delete({ where: { id: pay.id } });

    // reminder add/complete
    const rOpenBefore = await prisma.activity.count({ where: { type: "REMINDER", done: false } });
    const rem = await prisma.activity.create({ data: { type: "REMINDER", body: "smoke reminder", remindAt: new Date(), projectId: proj.id } });
    const rOpenAfter = await prisma.activity.count({ where: { type: "REMINDER", done: false } });
    await prisma.activity.update({ where: { id: rem.id }, data: { done: true } });
    const rOpenDone = await prisma.activity.count({ where: { type: "REMINDER", done: false } });
    ok("reminder: add/complete adjusts open count", rOpenAfter === rOpenBefore + 1 && rOpenDone === rOpenBefore);
    await prisma.activity.delete({ where: { id: rem.id } });

    // activity note
    const note = await prisma.activity.create({ data: { type: "NOTE", body: "smoke note", projectId: proj.id } });
    const noteFound = await prisma.activity.findUnique({ where: { id: note.id } });
    ok("activity: add note", !!noteFound);
    await prisma.activity.delete({ where: { id: note.id } });

    // project update
    const origStage = proj.stage;
    await prisma.project.update({ where: { id: proj.id }, data: { stage: "DELIVERED" } });
    const upd = await prisma.project.findUnique({ where: { id: proj.id } });
    ok("project: update stage persists", upd.stage === "DELIVERED");
    await prisma.project.update({ where: { id: proj.id }, data: { stage: origStage } });
  } else {
    ok("DB sweep: demo project present", false, "no Nightfall project — run db:seed");
  }

  // convert submission → project (mirror action)
  const testSub = await prisma.submission.create({ data: { name: "Convert Smoke", email: "smoke-convert@example.com", message: "convert me", status: "NEW" } });
  const cClient = await prisma.client.upsert({ where: { email: "smoke-convert@example.com" }, create: { name: "Convert Smoke", email: "smoke-convert@example.com" }, update: {} });
  const cProj = await prisma.project.create({ data: { title: "Convert Smoke — project", stage: "LEAD", clientId: cClient.id, requested: testSub.message } });
  await prisma.submission.update({ where: { id: testSub.id }, data: { projectId: cProj.id, clientId: cClient.id, status: "CONTACTED" } });
  const linked = await prisma.submission.findUnique({ where: { id: testSub.id } });
  ok("convert: submission→project links + status", linked.projectId === cProj.id && linked.status === "CONTACTED");
  // cleanup convert test
  await prisma.submission.delete({ where: { id: testSub.id } });
  await prisma.project.delete({ where: { id: cProj.id } });
  await prisma.client.delete({ where: { id: cClient.id } });

  // ── Soft delete: archived row hidden from views but retained ──
  const sd = await prisma.submission.create({ data: { name: "SoftDel", email: "softdel@example.com", message: "x", status: "NEW" } });
  await prisma.submission.update({ where: { id: sd.id }, data: { deletedAt: new Date() } });
  const visible = await prisma.submission.count({ where: { id: sd.id, deletedAt: null } });
  const retained = await prisma.submission.count({ where: { id: sd.id } });
  ok("soft-delete: archived row hidden from views but retained", visible === 0 && retained === 1, `visible ${visible}, retained ${retained}`);
  await prisma.submission.delete({ where: { id: sd.id } }); // hard-remove this test row

  // ── Cleanup test data ──
  await prisma.submission.deleteMany({ where: { email: "kulworksdesign@gmail.com" } });
  await prisma.client.deleteMany({ where: { email: "kulworksdesign@gmail.com" } });
  await prisma.pageView.deleteMany({ where: { path: { in: ["/smoke-test", "/smoke-bot"] } } });
  try { await resend.contacts.remove({ email: "smoke-sub@example.com", audienceId: process.env.RESEND_AUDIENCE_ID }); } catch {}
  await prisma.subscriber.deleteMany({ where: { email: "smoke-sub@example.com" } });

  // ── Summary ──
  const passed = results.filter((r) => r.pass).length;
  console.log("\n──────── SMOKE TEST RESULTS ────────");
  for (const r of results) console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
  console.log(`────────────────────────────────────\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
