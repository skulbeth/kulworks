// Tests an admin login the same way the website does (publishable key + password).
// Usage: npm run admin:check -- <email> <password>
import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: npm run admin:check -- <email> <password>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  console.error(`❌ Login FAILED: ${error.message}`);
  process.exit(1);
}
console.log(`✅ Login works for ${data.user.email}`);
