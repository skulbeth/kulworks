-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "calendarEventId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deliveryEventId" TEXT,
ADD COLUMN     "dueEventId" TEXT;
