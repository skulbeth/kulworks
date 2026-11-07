-- Role to Reign Rules Helper chat records
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL DEFAULT 'roletoreign',
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "outcome" TEXT NOT NULL,
    "model" TEXT,
    "latencyMs" INTEGER,
    "turn" INTEGER NOT NULL DEFAULT 1,
    "sessionId" TEXT,
    "visitorHash" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatLog_createdAt_idx" ON "ChatLog"("createdAt");
CREATE INDEX "ChatLog_outcome_createdAt_idx" ON "ChatLog"("outcome", "createdAt");
