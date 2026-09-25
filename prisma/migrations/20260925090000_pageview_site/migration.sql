-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "site" TEXT NOT NULL DEFAULT 'kulworks';

-- CreateIndex
CREATE INDEX "PageView_site_createdAt_idx" ON "PageView"("site", "createdAt");
