"use server";

// Password reset. Only a session that proves control of the email inbox (it came from a
// reset / invite link) or a fully signed-in admin (2FA cleared) may set a new password;
// a password-only session that still owes its 2FA code must not be able to change it.
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, twoFactorSatisfied } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LINK_METHODS = new Set(["recovery", "invite", "magiclink", "otp"]);
const LINK_MAX_AGE_MS = 60 * 60 * 1000; // a reset link session can set the password for 1 hour

async function resetAllowed(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const fromLink = (aal?.currentAuthenticationMethods ?? []).some(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      LINK_METHODS.has(m.method) &&
      Date.now() - m.timestamp * 1000 < LINK_MAX_AGE_MS
  );
  if (fromLink) return true;

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || profile.deactivatedAt) return false;
  if (!profile.twoFactorEnabled) return true;
  return twoFactorSatisfied(user.id);
}

export async function canResetPassword() {
  return { ok: await resetAllowed() };
}

export async function setNewPassword(password: string) {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false as const, error: "Use at least 8 characters." };
  }
  if (!(await resetAllowed())) {
    return { ok: false as const, error: "This reset link has expired. Request a new one from the sign-in page." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
