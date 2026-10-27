-- Super rush is now something the customer ticks (front of the queue, flat fee) instead
-- of a fee worked out from the due date. Defaults to false, so existing submissions are
-- untouched.
ALTER TABLE "Submission" ADD COLUMN "superRush" BOOLEAN NOT NULL DEFAULT false;

-- Where a shipped order goes: we ship to the US, Canada and Mexico only. Optional;
-- older rows stay null, which means US.
ALTER TABLE "Submission" ADD COLUMN "shipCountry" TEXT;
ALTER TABLE "Project" ADD COLUMN "shipCountry" TEXT;
