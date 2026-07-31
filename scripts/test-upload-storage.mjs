// Smoke-test the "uploads" storage bucket: write a tiny image, sign it, fetch it, delete it.
import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);
const BUCKET = "uploads";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const path = `smoke-test/${process.env.STAMP || "t"}.png`;

const up = await supa.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
console.log("upload:", up.error ? "FAIL " + up.error.message : "ok");

const sign = await supa.storage.from(BUCKET).createSignedUrl(path, 60);
console.log("sign:", sign.error ? "FAIL " + sign.error.message : "ok");
if (sign.data?.signedUrl) {
  const r = await fetch(sign.data.signedUrl);
  console.log("fetch signed url:", r.status);
}

const del = await supa.storage.from(BUCKET).remove([path]);
console.log("cleanup:", del.error ? "FAIL " + del.error.message : "ok");
