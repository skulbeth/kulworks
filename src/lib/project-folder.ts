// The client's Drive folder for a job. Made the moment they accept the quote (so the page
// can hand them somewhere to put their files right away), or adopted from the folder
// their original request already made. Shared with their email so Sam never has to.
import { prisma } from "@/lib/prisma";
import { driveConfigured, createClientFolder, folderIdFromUrl, shareFolderWith } from "@/lib/google-drive";
import { logError } from "@/lib/log-error";

export async function ensureProjectFolder(projectId: string): Promise<{ id: string; url: string } | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, driveFolderId: true, driveFolderUrl: true, client: { select: { name: true, email: true } } },
  });
  if (!project) return null;
  if (project.driveFolderId && project.driveFolderUrl) {
    return { id: project.driveFolderId, url: project.driveFolderUrl };
  }
  if (!driveConfigured()) return null;

  try {
    // Their request may already have a folder (they ticked the box): use that one.
    const sub = await prisma.submission.findFirst({
      where: {
        driveFolderUrl: { not: null },
        OR: [{ projectId }, { email: project.client.email }],
      },
      orderBy: { createdAt: "desc" },
      select: { driveFolderUrl: true },
    });
    let url = sub?.driveFolderUrl ?? null;
    let id = folderIdFromUrl(url);
    if (!id) {
      url = await createClientFolder(`C - ${project.client.name} - ${project.title}`.slice(0, 200));
      id = folderIdFromUrl(url);
    }
    if (!id || !url) return null;

    // Edit access for their own email (works when it's a Google account; everyone else
    // uploads through the page). Google sends them nothing.
    await shareFolderWith(id, project.client.email);

    await prisma.project.update({ where: { id: projectId }, data: { driveFolderId: id, driveFolderUrl: url } });
    return { id, url };
  } catch (e) {
    await logError(e, "ensureProjectFolder");
    return null;
  }
}
