-- Client file folder per project (Google Drive)
ALTER TABLE "Project" ADD COLUMN "driveFolderId" TEXT;
ALTER TABLE "Project" ADD COLUMN "driveFolderUrl" TEXT;
