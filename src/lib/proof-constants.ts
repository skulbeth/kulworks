// Values the browser uploader needs too. Kept apart from lib/proofs (which uses the
// service-role Supabase client) so importing them never pulls server code into the
// client bundle.

/** Previews are stored at half the 300 dpi print resolution. */
export const PREVIEW_DPI = 150;

/** Same private bucket as lib/uploads UPLOAD_BUCKET, under the "proofs/" prefix. */
export const PROOF_BUCKET = "uploads";
