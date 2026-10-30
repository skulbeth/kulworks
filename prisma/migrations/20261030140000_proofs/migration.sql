-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "widthIn" DOUBLE PRECISION NOT NULL,
    "heightIn" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofItem" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "frontPath" TEXT,
    "backPath" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofComment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "body" TEXT NOT NULL,
    "fromClient" BOOLEAN NOT NULL DEFAULT true,
    "resolvedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proof_token_key" ON "Proof"("token");

-- CreateIndex
CREATE INDEX "Proof_projectId_idx" ON "Proof"("projectId");

-- CreateIndex
CREATE INDEX "ProofItem_proofId_idx" ON "ProofItem"("proofId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofItem_proofId_key_key" ON "ProofItem"("proofId", "key");

-- CreateIndex
CREATE INDEX "ProofComment_itemId_idx" ON "ProofComment"("itemId");

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofItem" ADD CONSTRAINT "ProofItem_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofComment" ADD CONSTRAINT "ProofComment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProofItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

