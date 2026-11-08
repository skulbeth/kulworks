-- Quotes: is a sample proof approved before billing? (false = invoice on accept)
ALTER TABLE "Invoice" ADD COLUMN "proofFirst" BOOLEAN NOT NULL DEFAULT true;
