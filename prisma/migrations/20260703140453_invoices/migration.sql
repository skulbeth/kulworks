-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('QUOTE', 'INVOICE');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "DocType" NOT NULL DEFAULT 'INVOICE',
    "status" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_token_key" ON "Invoice"("token");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
