"use server";

// Server actions used DURING login (the user has a session but may still owe a 2FA code).
// These intentionally do NOT call requireProfile — that would re-trigger the 2FA gate.
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import {
  TWOFA_COOKIE,
  COOKIE_TTL_MS,
  CODE_TTL_MS,
  signSession,
  verifySession,
  newCode,
  hashCode,
} from "@/lib/two-factor";

const MAX_ATTEMPTS = 5;

// Is this session already past its 2FA requirement? (authenticator app → aal2, or a valid cookie)
async function isVerified(userId: string) {
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") return true;
  const jar = await cookies();
  return verifySession(jar.get(TWOFA_COOKIE)?.value, userId, Date.now());
}

// What does the login page need to show after the password step?
export async function getMy2faStatus() {
  const user = await getSessionUser();
  if (!user) return { authed: false as const };

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  // No profile yet (first login) or 2FA off → nothing more to do.
  if (!profile || !profile.twoFactorEnabled) {
    return { authed: true as const, enabled: false, hasTotp: false, verified: true };
  }

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = !!factors?.totp?.some((f) => f.status === "verified");

  return {
    authed: true as const,
    enabled: true,
    hasTotp,
    verified: await isVerified(user.id),
  };
}

// Email the current user a fresh 6-digit code.
export async function sendEmail2faCode() {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false as const };

  const code = newCode();
  await prisma.twoFactorCode.deleteMany({ where: { userId: user.id } });
  await prisma.twoFactorCode.create({
    data: {
      userId: user.id,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  await sendMail({
    to: user.email,
    subject: `Your Kulworks admin code: ${code}`,
    text:
      `Your Kulworks admin sign-in code is:\n\n    ${code}\n\n` +
      `It expires in 10 minutes. If you didn't try to sign in, you can ignore this email ` +
      `and consider changing your password.`,
  });

  return { ok: true as const };
}

// Verify a submitted email code; on success, set the signed 2FA cookie.
export async function verifyEmail2faCode(code: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "not-signed-in" };

  const rec = await prisma.twoFactorCode.findFirst({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return { ok: false as const, error: "expired" };

  if (rec.attempts >= MAX_ATTEMPTS) {
    await prisma.twoFactorCode.delete({ where: { id: rec.id } });
    return { ok: false as const, error: "too-many" };
  }

  if (hashCode(code) !== rec.codeHash) {
    await prisma.twoFactorCode.update({
      where: { id: rec.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "bad" };
  }

  // Correct: burn all codes for this user and mark the session verified.
  await prisma.twoFactorCode.deleteMany({ where: { userId: user.id } });
  const jar = await cookies();
  jar.set(TWOFA_COOKIE, signSession(user.id, Date.now() + COOKIE_TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(COOKIE_TTL_MS / 1000),
  });
  return { ok: true as const };
}
