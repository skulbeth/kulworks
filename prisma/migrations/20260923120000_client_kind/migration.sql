-- CreateEnum
CREATE TYPE "ClientKind" AS ENUM ('CLIENT', 'CONTACT');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "kind" "ClientKind" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "lostAt" TIMESTAMP(3),
ADD COLUMN     "lostReason" TEXT;

-- CreateIndex
CREATE INDEX "Client_kind_idx" ON "Client"("kind");
