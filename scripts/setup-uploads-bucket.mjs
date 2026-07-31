// One-time: create the private "uploads" Supabase Storage bucket used by the
// public /upload page (trade-show photo drop). Safe to re-run.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supa = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "uploads";

const { data: buckets, error: listErr } = await supa.storage.listBuckets();
if (listErr) {
  console.error("listBuckets failed:", listErr.message);
  process.exit(1);
}

if (buckets?.some((b) => b.name === BUCKET)) {
  console.log(`Bucket "${BUCKET}" already exists.`);
} else {
  const { error } = await supa.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: "15MB",
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ],
  });
  if (error) {
    console.error("createBucket failed:", error.message);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET}" created (private, 15MB, images only).`);
}
