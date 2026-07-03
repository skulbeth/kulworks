// Server-side auth helpers for the admin portal.
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TWOFA_COOKIE, verifySession } from "@/lib/two-factor";
import type { Profile } from "@prisma/client";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Has this session cleared its 2FA requirement?
// Either the authenticator app was used (Supabase session is aal2) or a valid email-2FA cookie.
async function twoFactorSatisfied(userId: string): Promise<boolean> {
  const jar = await cookies();
  if (verifySession(jar.get(TWOFA_COOKIE)?.value, userId, Date.now())) return true;
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return aal?.currentLevel === "aal2";
}

// Returns the logged-in user + their Profile, creating the Profile on first login.
// The very first profile becomes OWNER; everyone after defaults to STAFF.
// Redirects to the login page if there's no session.
export async function requireProfile(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  profile: Profile;
}> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login/");

  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) {
    // Deactivated admins lose access even if they still hold a session.
    if (existing.deactivatedAt) redirect("/admin/login/?error=deactivated");
    // 2FA-enabled admins must clear the second step (app code or emailed code) first.
    if (existing.twoFactorEnabled && !(await twoFactorSatisfied(user.id))) {
      redirect("/admin/login/?step=2fa");
    }
    return { user, profile: existing };
  }

  const isFirst = (await prisma.profile.count()) === 0;
  const profile = await prisma.profile.create({
    data: {
      id: user.id,
      email: user.email ?? "",
      role: isFirst ? "OWNER" : "STAFF",
    },
  });
  return { user, profile };
}
