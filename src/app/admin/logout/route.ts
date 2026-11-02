import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TWOFA_COOKIE } from "@/lib/two-factor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  // Local scope: end THIS browser's session only, not every device (e.g. the phone app).
  await supabase.auth.signOut({ scope: "local" });
  const res = NextResponse.redirect(new URL("/admin/login/", request.url), { status: 303 });
  // Drop the email-2FA marker so the next sign-in requires a fresh code.
  res.cookies.delete(TWOFA_COOKIE);
  return res;
}
