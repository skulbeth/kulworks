"use client";

/**
 * A short, silent, looping process shot.
 *
 * These used to be animated WebPs. That format has no inter-frame compression, so a
 * clip costs roughly (frames x pixels) and the quality knob barely moves it: measured
 * on the hex press shot, q68 -> q50 only went 2.3M -> 1.9M. Smooth motion was therefore
 * only ever affordable by dropping to 6-7fps, which is what made them stutter and smear.
 *
 * h264 stores only what moved, so 30fps costs the same as 24fps. Same shot, same second:
 * 1100x733 at 30fps is a third the weight of 900x600 at 15fps.
 *
 * Three things an animated WebP could not do, which come free here:
 *  - A WebP must download in full before its first frame paints. A video paints `poster`
 *    immediately and streams the rest, so the slot is never a grey box.
 *  - Nothing downloads until the clip is actually on screen and current. Off-screen
 *    portfolio tiles and the carousel slides you have not reached cost only their poster.
 *  - prefers-reduced-motion is honoured. An animated image cannot be paused; a video can,
 *    so visitors who ask for stillness get the poster frame and nothing ever moves.
 */

import { useEffect, useRef, useState } from "react";
import { posterFor } from "@/lib/clip";


export default function Clip({
  src,
  alt,
  className = "",
  active = true,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** False for a carousel slide that isn't the current one: holds it at its poster. */
  active?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // rootMargin starts the fetch just before the tile scrolls into view, so it is
    // already playing by the time it is actually looked at.
    const io = new IntersectionObserver(
      ([e]) => setOnScreen(e.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // `src` is attached only once the clip is wanted. Until then the element holds its
  // poster and has requested no bytes at all.
  const wanted = onScreen && active && !still;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (wanted) void v.play().catch(() => {});
    else v.pause();
  }, [wanted]);

  return (
    <video
      ref={ref}
      src={wanted ? src : undefined}
      poster={posterFor(src)}
      loop
      muted
      playsInline
      preload="none"
      aria-label={alt}
      role="img"
      className={className}
    />
  );
}
