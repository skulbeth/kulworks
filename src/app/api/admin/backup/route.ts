// On-demand data export — download a full JSON backup from the admin. Auth-required.
import { requireApiProfile } from "@/lib/auth";
import { buildBackup } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  // Full admin only: signed in, active, AND past 2FA (a password alone can't pull the dump).
  if (!(await requireApiProfile())) return new Response("Unauthorized", { status: 401 });

  const { json, filename } = await buildBackup();
  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
