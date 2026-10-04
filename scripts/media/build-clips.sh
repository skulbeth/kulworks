#!/usr/bin/env bash
#
# Rebuilds every process clip in the site from the raw footage on D:.
#
#   bash scripts/media/build-clips.sh            # all of them
#   bash scripts/media/build-clips.sh hex deck   # just those
#
# WHY THIS FILE EXISTS
# --------------------
# The timestamps and crops below are the expensive part. Each one was found by
# extracting contact sheets across minutes of handheld 4K and looking at them.
# "Where exactly does the piece pop out of the die" took three passes and three
# different source files to answer. Losing these numbers means doing that again,
# so they live in the repo rather than in a scratch directory.
#
# FORMAT: h264, not animated WebP
# ------------------------------
# These were animated WebPs until 2026-10-02. WebP has no inter-frame compression,
# so a clip costs roughly (frames x pixels) and the quality knob barely moves it:
# measured on the hex press shot, q68 -> q50 only went 2.3M -> 1.9M, while dropping
# the width did all the real work. That meant smooth motion was only affordable at
# 6-7fps, which is what made them stutter. Same shot, same second:
#
#   animated WebP    900x600   15fps   2.3M
#   h264            1100x733   30fps   0.6M
#
# Higher resolution, native frame rate, a third of the weight. 30fps matches the
# phone footage so there is no resampling judder. Sam's rule, learned the hard way:
# FRAME RATE IS WHAT HE JUDGES QUALITY BY. If one of these has to get smaller, cut
# the resolution or the duration, never the fps.
#
# POSTERS
# -------
# Each clip also emits <name>-poster.webp. src/components/Clip.tsx DERIVES that path
# at runtime (posterFor(): foo.mp4 -> foo-poster.webp), so no literal reference to it
# exists anywhere in the source. Any "find unused images" sweep will flag all eight as
# dead. They are not. Deleting them kills the first paint on every clip.
#
# SOURCE GEOMETRY TRAP
# --------------------
# Phone clips decode to 2160x3840 PORTRAIT after auto-rotation, even though ffprobe
# reports 3840x2160. A 3:2 crop can therefore use at most 2160x1440 of them, which is
# why nothing here can be "zoomed out" past full width without side bars. The Session
# 3c press footage and the card-printing clips are true landscape and crop freely.
set -euo pipefail

cd "$(dirname "$0")/../.."
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

W=1100; H=$((W * 2 / 3)); FPS=30; CRF=27

R="/d/Kulworks/Raw Footage"
CS="$R/Client - Sam"                       # NB: this folder is OTHER Sam, not Sam Kulbeth
CP="$R/card printing"
CB="$R/Chopping Board Pieces/PXL_20260816_150724574.mp4"
EL="$R/Elegoo Saturn Resin Printer Raw Videos"
MIX="$R/Mix of recent projects"
HX="$R/RtR Hex Tile Cutting - Kickstarter Run (Sep 26 - Oct 1)"
PAN="$HX/02 Finished Stacks B-roll/2026-09-28 Stacks pan - wide, second pass (6s) - PXL_20260929_020420647.mp4"
PRESS="$HX/01 Press Sessions/2026-10-01 Session 3c - red shirt, green boards, ends on stack (16m27s) - PXL_20261001_220110560.mp4"
S3C="$PRESS"
PNC="$R/Client - Brad Miller PANIC Deck (Sep 27-28)/02 Finished Deck Reveal"
FLIP="$PNC/2026-09-28 Deck flip - backs to colored number fronts (5s) - PXL_20260928_173132837.mp4"
RIFF="$MIX/PXL_20260918_172229884.mp4"

# Intermediates stay near-lossless (crf 14). All real compression happens once, at the
# join, so concatenating two shots never compresses anything twice.
seg() { ffmpeg -loglevel error -y -ss "$3" -t "$4" -i "$2" \
  -vf "$5,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},setsar=1" \
  -c:v libx264 -crf 14 -pix_fmt yuv420p -an "$1"; }

join() { out="$1"; shift; : > "$T/l.txt"; for f in "$@"; do echo "file '$f'" >> "$T/l.txt"; done
  ffmpeg -loglevel error -y -f concat -safe 0 -i "$T/l.txt" -c copy "$T/j.mp4"
  ffmpeg -loglevel error -y -i "$T/j.mp4" -c:v libx264 -crf $CRF -preset veryslow \
    -pix_fmt yuv420p -profile:v high -level 4.0 -movflags +faststart -an "$out"
  ffmpeg -loglevel error -y -i "$T/j.mp4" -frames:v 1 -c:v libwebp -q:v 82 "${out%.mp4}-poster.webp"
  printf "%8s  %s\n" "$(du -h "$out" | cut -f1)" "$(basename "$out")"; }

want() { [ $# -eq 0 ] && return 0; for a in "$@"; do [ "$a" = "$CLIP" ] && return 0; done; return 1; }

# ── hex-cut-and-stacked ──────────────────────────────────────────────────────
# THE ONE THAT TOOK THREE TRIES. Sam's note: "you missed the part where the piece
# actually pops out of the die cutter."
#   Attempt 1 used Chopping Board Pieces @32.5s. That is AFTER the press stroke; it
#     showed a gloved hand tidying up and nothing else.
#   Attempt 2 moved to 29.0s to catch the stroke, then ran to 34.4 with a crop that
#     ramped y to follow the camera tilt. Still wrong: that source tilts off the
#     action, so the piece coming free is simply not in the usable footage.
#   Attempt 3, this one: Session 3c has the whole beat in ONE static wide shot.
#     713.0 handle pull -> cut -> 713.8 board lifted -> 715.4 tilted ->
#     715.8 the hex drops clear of the acrylic frame. That is the pop-out.
# Sources checked and rejected: Weaver Clicker Press (chest-cam POV, torso fills half
# the frame), Session 1c (shot rotated, tile overflows), Session 1d (cluttered
# over-the-shoulder), "ASMR Board Cutting" (mislabelled - it is unboxing blank stock),
# and the other three Chopping Board files (talking-head selfies, not cutting).
CLIP=hex;  want "$@" && {
  seg "$T/e1.mp4" "$S3C" 712.7 4.1 "crop=2100:1400:950:300"
  seg "$T/e2.mp4" "$PAN"     0   1.8 "crop=3240:2160:300:0"
  join public/images/studio/hex-cut-and-stacked.mp4 "$T/e1.mp4" "$T/e2.mp4"; }

# ── deck-printed-and-riffled ─────────────────────────────────────────────────
# Was the "getting to know you" print run (same shot the cards slide already used, so
# it appeared twice in one carousel) plus a riffle framed so tight the cards ran off
# the top at every crop position. That riffle CANNOT be recentred: the cards are
# bigger than the frame. Its opening holds one whole card, so that is all it is used for.
# The PANIC fan is timing-sensitive. Measured against the vivid card borders, it spans
# the full frame width and sits centred from 3.2s to 4.3s, then collapses right: by
# 4.7s it only spans x 737-2135 of 2160. Cut late and it is off-centre.
CLIP=deck; want "$@" && {
  seg "$T/c1.mp4" "$RIFF" 2.1 1.6 "crop=2160:1440:0:720"
  seg "$T/c2.mp4" "$FLIP" 3.0 2.5 "crop=2160:1440:0:780"
  join public/images/studio/deck-printed-and-riffled.mp4 "$T/c1.mp4" "$T/c2.mp4"; }

# ── the rest, unchanged since the h264 conversion ────────────────────────────
CLIP=boarduv; want "$@" && {
  seg "$T/a1.mp4" "$CS/PXL_20260917_172956710.mp4" 28 2.4 "crop=2160:1440:0:1100"
  seg "$T/a2.mp4" "/d/Kulworks/Client - Aaron Daniels/Double-Sided Sample.mp4" 0.4 2.2 "crop=720:480:0:400"
  join public/images/studio/board-uv-and-double-sided.mp4 "$T/a1.mp4" "$T/a2.mp4"; }

CLIP=cards; want "$@" && {
  seg "$T/b1.mp4" "$CP/PXL_20260811_011102742.mp4" 12 2.4 "crop=3240:2160:300:0"
  seg "$T/b2.mp4" "$CP/PXL_20260809_011525867.mp4"  2 2.2 "crop=3240:2160:300:0"
  join public/images/studio/cards-printing-and-sheet.mp4 "$T/b1.mp4" "$T/b2.mp4"; }

CLIP=resin; want "$@" && {
  seg "$T/d1.mp4" "$EL/PXL_20260704_183818921.mp4" 22 2.4 "crop=iw:ih"
  seg "$T/d2.mp4" "$EL/96c52986-3f65-4ec9-aa94-1dc4e16866ba.mp4" 3 2.2 "crop=iw:ih"
  join public/images/studio/resin-plate-and-batch.mp4 "$T/d1.mp4" "$T/d2.mp4"; }

CLIP=boardcut; want "$@" && {
  seg "$T/f1.mp4" "$CB" 29 3.4 "crop=2160:1440:0:2200"
  join public/images/studio/board-cutting.mp4 "$T/f1.mp4"; }

CLIP=press; want "$@" && {
  seg "$T/g1.mp4" "$PRESS" 417 2.2 "crop=1800:1200:900:1150"
  seg "$T/g2.mp4" "$PAN"     0 2.3 "crop=3240:2160:300:0"
  join public/images/portfolio/tiles/hex-press-and-stacks.mp4 "$T/g1.mp4" "$T/g2.mp4"; }

CLIP=finish; want "$@" && {
  seg "$T/h1.mp4" "$CS/PXL_20260917_174230388.mp4" 2.0 2.2 "crop=iw:iw*2/3:0:(ih-iw*2/3)/2"
  seg "$T/h2.mp4" "$CS/PXL_20260917_212232049.mp4" 3.0 2.3 "crop=iw:iw*2/3:0:(ih-iw*2/3)/2"
  join public/images/portfolio/tiles/board-print-and-finish.mp4 "$T/h1.mp4" "$T/h2.mp4"; }
