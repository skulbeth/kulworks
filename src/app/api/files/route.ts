// Client file uploads from the quote page, straight into their Google Drive folder.
// "start": hands back a Google resumable-upload URL for one file; the browser PUTs the
// bytes to Google itself (no size cap from Vercel, no Google account needed).
// "done": the batch finished, so Sam gets one alert and a timeline note.
// The quote link is the credential: only an accepted quote with a folder may upload.
import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { startDriveUpload } from "@/lib/google-drive";
import { ensureProjectFolder } from "@/lib/project-folder";
import { notify, projectUrl } from "@/lib/notify";
import { logError } from "@/lib/log-error";
import { site } from "@/data/site";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB a file: big print PDFs and zips are fine

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Only our own pages may start uploads (Google ties the upload URL to this origin): the
// browser's Origin must be the site this request arrived at.
function pageOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  return origin && origin === new URL(request.url).origin ? origin : null;
}

// Drive file names: no path bits or control characters.
function safeName(name: string): string {
  const n = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim();
  return n.slice(0, 150) || "file";
}

export async function POST(request: Request) {
  try {
    const origin = pageOrigin(request);
    if (!origin) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const token = str(body.token, 200);
    const inv = token
      ? await prisma.invoice.findUnique({
          where: { token },
          select: { id: true, number: true, type: true, status: true, deletedAt: true, acceptedAt: true, projectId: true, clientId: true, client: { select: { name: true } } },
        })
      : null;
    if (!inv || inv.deletedAt || inv.type !== "QUOTE" || !inv.acceptedAt || inv.status === "VOID" || inv.status === "DRAFT") {
      return NextResponse.json({ ok: false, error: "Uploads open once the quote is accepted." }, { status: 403 });
    }

    if (body.action === "done") {
      if (!(await rateLimit(`files-done:${token}`, 20, 60 * 60_000))) return NextResponse.json({ ok: true });
      const names = (Array.isArray(body.names) ? body.names : []).map((n) => safeName(str(n, 150))).slice(0, 50);
      if (!names.length) return NextResponse.json({ ok: true });
      const list = names.join(", ").slice(0, 600);
      await prisma.activity.create({
        data: {
          type: "NOTE",
          body: `Client uploaded ${names.length} file${names.length === 1 ? "" : "s"} to their Drive folder: ${list}`,
          projectId: inv.projectId,
          clientId: inv.clientId,
        },
      });
      after(() =>
        notify({
          kind: "upload",
          title: `Files from ${inv.client.name}`,
          body: `${names.length} file${names.length === 1 ? "" : "s"} in their Drive folder · ${list.slice(0, 140)}`,
          url: projectUrl(inv.projectId),
          projectId: inv.projectId,
          clientId: inv.clientId,
        })
      );
      return NextResponse.json({ ok: true });
    }

    // action "start": one file
    if (!(await rateLimit(`files:${token}`, 200, 60 * 60_000))) {
      return NextResponse.json({ ok: false, error: "That's a lot of files at once. Give it a few minutes." }, { status: 429 });
    }
    const name = safeName(str(body.name, 300));
    const size = typeof body.size === "number" ? body.size : -1;
    const type = str(body.type, 150) || "application/octet-stream";
    if (size <= 0 || size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: `"${name}" is too large (2 GB max each).` }, { status: 400 });
    }
    const folder = await ensureProjectFolder(inv.projectId);
    if (!folder) {
      return NextResponse.json(
        { ok: false, error: `Uploads aren't working right now. Reply to ${site.email} with your files instead.` },
        { status: 503 }
      );
    }
    const uploadUrl = await startDriveUpload({ folderId: folder.id, name, mimeType: type, size, origin });
    if (!uploadUrl) {
      return NextResponse.json({ ok: false, error: "Couldn't start that upload. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, uploadUrl });
  } catch (err) {
    await logError(err, "/api/files");
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
