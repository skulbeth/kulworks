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
// Either a valid email-2FA cookie, or an authenticator-app (aal2) session we can trust (below).
export async function twoFactorSatisfied(userId: string): Promise<boolean> {
  const jar = await cookies();
  if (verifySession(jar.get(TWOFA_COOKIE)?.value, userId, Date.now())) return true;
  return trustedAal2();
}

// aal2 alone isn't proof: Supabase lets a password-only (aal1) session ENROLL its first TOTP
// factor and verify it, which upgrades that same session to aal2. So an app code only counts
// when the verified TOTP factor already existed BEFORE this session's first-factor sign-in
// (i.e. it was set up earlier, from the portal, not minted just now by whoever holds the
// password). A factor added during this session doesn't count until the next sign-in, and
// the emailed code always works as the fallback, so nobody gets locked out.
async function trustedAal2(): Promise<boolean> {
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return false;
  const firstFactorTs = (aal.currentAuthenticationMethods ?? [])
    .filter((m): m is { method: string; timestamp: number } => typeof m === "object" && m !== null)
    .filter((m) => !/totp|mfa/i.test(m.method))
    .map((m) => m.timestamp * 1000);
  if (firstFactorTs.length === 0) return false;
  const signedInAt = Math.min(...firstFactorTs);
  const { data: factors } = await supabase.auth.mfa.listFactors();
  return !!factors?.totp?.some(
    (f) => f.status === "verified" && new Date(f.created_at).getTime() < signedInAt
  );
}

// API-route version of requireProfile: same checks (signed in, profile exists, not
// deactivated, 2FA cleared) but returns null instead of redirecting, so the caller can
// answer 401 JSON. Never creates a profile.
export async function requireApiProfile(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  profile: Profile;
} | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.deactivatedAt) return null;
  if (profile.twoFactorEnabled && !(await twoFactorSatisfied(user.id))) return null;
  return { user, profile };
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
