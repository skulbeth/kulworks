// Creates OR updates an admin login (Supabase auth user) + its Profile row.
// Usage: npm run admin:create -- <email> <password> ["Full Name"]
// If the email already exists, its password is updated. First admin = OWNER.
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const [, , email, password, name] = process.argv;
if (!email || !password) {
  console.error('Usage: npm run admin:create -- <email> <password> ["Full Name"]');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let userId;
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error && /already/i.test(error.message)) {
  // User exists → find them and update the password.
  const { data: list, error: lErr } = await supabase.auth.admin.listUsers();
  if (lErr) {
    console.error("❌ Could not list users:", lErr.message);
    process.exit(1);
  }
  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!existing) {
    console.error("❌ User reported as existing but not found.");
    process.exit(1);
  }
  const { error: uErr } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
  });
  if (uErr) {
    console.error("❌ Could not update password:", uErr.message);
    process.exit(1);
  }
  userId = existing.id;
  console.log("↻ Existing user — password updated.");
} else if (error) {
  console.error("❌ Could not create auth user:", error.message);
  process.exit(1);
} else {
  userId = data.user.id;
  console.log("• Created new auth user.");
}

const prisma = new PrismaClient();
try {
  const isFirst = (await prisma.profile.count()) === 0;
  const profile = await prisma.profile.upsert({
    where: { id: userId },
    update: { email, name: name ?? undefined },
    create: {
      id: userId,
      email,
      name: name ?? null,
      role: isFirst ? "OWNER" : "STAFF",
    },
  });
  console.log(`✅ Admin ready: ${email} (${profile.role})`);
} finally {
  await prisma.$disconnect();
}
