-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "storagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[];
