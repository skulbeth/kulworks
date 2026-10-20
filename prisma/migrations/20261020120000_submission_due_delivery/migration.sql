-- A quote request now carries its due date, how it gets to the customer (and the
-- shipping address when shipped), and for card orders whether every card shares one
-- back. All optional, so existing submissions are untouched.
ALTER TABLE "Submission" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN "deliveryMethod" TEXT;
ALTER TABLE "Submission" ADD COLUMN "shipStreet" TEXT;
ALTER TABLE "Submission" ADD COLUMN "shipCity" TEXT;
ALTER TABLE "Submission" ADD COLUMN "shipState" TEXT;
ALTER TABLE "Submission" ADD COLUMN "shipPostalCode" TEXT;
ALTER TABLE "Submission" ADD COLUMN "cardBacks" TEXT;
