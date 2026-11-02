// A tapped notification lands here: mark it read, then go where it points.
import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = new URL(request.url);
  // Full admin (past 2FA) only; otherwise sign in and come straight back here.
  if (!(await requireApiProfile())) {
    const login = new URL("/admin/login/", base);
    login.searchParams.set("next", `/admin/notifications/open/${encodeURIComponent(id)}/`);
    return NextResponse.redirect(login);
  }
  const n = await prisma.notification.findUnique({ where: { id } }).catch(() => null);
  if (!n) return NextResponse.redirect(new URL("/admin/notifications/", base));
  if (!n.readAt) await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  // Only ever follow our own admin paths.
  const to = n.url && n.url.startsWith("/admin/") ? n.url : "/admin/notifications/";
  return NextResponse.redirect(new URL(to, base));
}
