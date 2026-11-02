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
  const cookie = jar.get(TWOFA_COOKIE)?.value;
  if (cookie && verifySession(cookie, userId, await currentSessionId(), Date.now())) return true;
  return trustedAal2();
}

/** This sign-in's Supabase session id (from the verified access token), or null. */
export async function currentSessionId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sid = (data?.claims as { session_id?: unknown } | undefined)?.session_id;
  return typeof sid === "string" && sid ? sid : null;
}

// Authenticator apps the admin set up from the portal (after passing 2FA there). Kept on
// our side because Supabase lets a password-only session enroll a factor of its own.
const trustedKey = (userId: string) => `totp_trusted:${userId}`;

export async function trustedFactorIds(userId: string): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: trustedKey(userId) } });
  try {
    const ids = JSON.parse(row?.value ?? "[]");
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function setTrustedFactorIds(userId: string, ids: string[]): Promise<void> {
  const value = JSON.stringify([...new Set(ids)]);
  await prisma.setting.upsert({
    where: { key: trustedKey(userId) },
    update: { value },
    create: { key: trustedKey(userId), value },
  });
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
  return hasTrustedTotp();
}

// Is there an authenticator app this session may use? Only one set up before this
// session's password sign-in (see above). The login page offers the app option only
// when this is true; offering it otherwise would accept the code and then bounce him
// straight back to login, with no message, forever.
export async function hasTrustedTotp(): Promise<boolean> {
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const firstFactorTs = (aal?.currentAuthenticationMethods ?? [])
    .filter((m): m is { method: string; timestamp: number } => typeof m === "object" && m !== null)
    .filter((m) => !/totp|mfa/i.test(m.method))
    .map((m) => m.timestamp * 1000);
  if (firstFactorTs.length === 0) return false;
  const signedInAt = Math.min(...firstFactorTs);
  const [{ data: factors }, { data: userData }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.getUser(),
  ]);
  if (!userData.user) return false;
  // Both: set up from the portal (on our trusted list), and before this sign-in. The
  // timestamp alone wasn't enough: sign in, enroll, then sign in again, and the new
  // factor would look "older" than the second sign-in.
  const trusted = new Set(await trustedFactorIds(userData.user.id));
  return !!factors?.totp?.some(
    (f) =>
      f.status === "verified" && trusted.has(f.id) && new Date(f.created_at).getTime() < signedInAt
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

  // No profile = not on the team. Supabase lets anyone sign up for an account with the
  // public key, so a session alone proves nothing: team members are added from the Team
  // page (which creates their profile). The one exception is the very first login of a
  // brand-new install, which becomes the OWNER.
  const isFirst = (await prisma.profile.count()) === 0;
  if (!isFirst) redirect("/admin/login/?error=not-team"); // the login page drops the session
  const profile = await prisma.profile.create({
    data: { id: user.id, email: user.email ?? "", role: "OWNER" },
  });
  return { user, profile };
}
