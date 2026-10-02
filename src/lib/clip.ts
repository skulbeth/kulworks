/**
 * Clip helpers, kept out of the Clip component so server components (Placeholder)
 * can ask "is this a clip?" without importing a "use client" module.
 */

/** Clips are .mp4; everything else on the site is a still. */
export function isClip(src?: string): src is string {
  return !!src && src.endsWith(".mp4");
}

/** Poster lives beside the clip: foo.mp4 -> foo-poster.webp */
export function posterFor(src: string) {
  return src.replace(/\.mp4$/, "-poster.webp");
}
