// Server-side auth helpers for the admin portal.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Profile } from "@prisma/client";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
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
  if (existing) return { user, profile: existing };

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
