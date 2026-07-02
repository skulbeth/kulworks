// On-demand data export — download a full JSON backup from the admin. Auth-required.
import { getSessionUser } from "@/lib/auth";
import { buildBackup } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { json, filename } = await buildBackup();
  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
