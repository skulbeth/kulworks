-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('LEAD', 'QUOTED', 'APPROVED', 'IN_PRODUCTION', 'DELIVERED', 'CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'EMAIL_SENT', 'EMAIL_RECEIVED', 'CALL', 'MEETING', 'STATUS_CHANGE', 'PAYMENT', 'REMINDER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL DEFAULT 'LEAD',
    "clientId" TEXT NOT NULL,
    "requested" TEXT,
    "deliverables" TEXT,
    "cardCount" INTEGER,
    "cardSize" TEXT,
    "quantity" INTEGER,
    "finish" TEXT,
    "specsNotes" TEXT,
    "quotedAmount" DOUBLE PRECISION,
    "finalAmount" DOUBLE PRECISION,
    "materialCost" DOUBLE PRECISION,
    "depositPaid" DOUBLE PRECISION,
    "devHours" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "shipStreet" TEXT,
    "shipCity" TEXT,
    "shipState" TEXT,
    "shipPostalCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'NOTE',
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    "projectId" TEXT,
    "authorId" TEXT,
    "remindAt" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE INDEX "Project_dueDate_idx" ON "Project"("dueDate");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_occurredAt_idx" ON "Activity"("occurredAt");

-- CreateIndex
CREATE INDEX "Activity_remindAt_idx" ON "Activity"("remindAt");

-- CreateIndex
CREATE INDEX "Activity_projectId_idx" ON "Activity"("projectId");

-- CreateIndex
CREATE INDEX "Activity_clientId_idx" ON "Activity"("clientId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
