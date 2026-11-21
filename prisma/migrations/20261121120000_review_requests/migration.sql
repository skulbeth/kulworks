-- Google review request emails (queued on Delivered/Closed, sent one a day by the cron).
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sendAfter" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewRequest_status_sendAfter_idx" ON "ReviewRequest"("status", "sendAfter");
CREATE INDEX "ReviewRequest_clientId_idx" ON "ReviewRequest"("clientId");
