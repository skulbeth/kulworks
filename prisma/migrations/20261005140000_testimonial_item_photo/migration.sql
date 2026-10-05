-- A testimonial can now carry a photo of the item it is about, alongside the
-- screenshot of the message. Both are optional and live in the uploads bucket.
ALTER TABLE "Testimonial" ADD COLUMN "photoPath" TEXT;
