-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "extendRequestedAt" TIMESTAMP(3),
ADD COLUMN "sourceQuoteId" TEXT,
ADD COLUMN "validUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Invoice_sourceQuoteId_idx" ON "Invoice"("sourceQuoteId");
