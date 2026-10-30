-- AlterTable
ALTER TABLE "Proof" ADD COLUMN "clientNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProofItem" ADD COLUMN "backHash" TEXT,
ADD COLUMN "frontHash" TEXT,
ADD COLUMN "replacedAt" TIMESTAMP(3);
