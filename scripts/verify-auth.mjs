// One-off: creates a throwaway admin, signs in with the publishable key (the real
// login path), confirms a session, then deletes the test user + profile.
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const admin = createClient(url, secret, { auth: { persistSession: false } });
const email = "auth-test@kulworks.test";
const password = "TestPass123!";

const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (cErr) {
  console.error("❌ createUser failed:", cErr.message);
  process.exit(1);
}
console.log("• created test user");

const pubClient = createClient(url, pub, { auth: { persistSession: false } });
const { data: signin, error: sErr } = await pubClient.auth.signInWithPassword({
  email,
  password,
});
console.log(
  sErr
    ? `❌ sign-in FAILED: ${sErr.message}`
    : `✅ sign-in OK — session issued for ${signin.user.email}`
);

// cleanup
const prisma = new PrismaClient();
try {
  await prisma.profile.deleteMany({ where: { id: created.user.id } });
} finally {
  await prisma.$disconnect();
}
await admin.auth.admin.deleteUser(created.user.id);
console.log("🧹 test user removed");
