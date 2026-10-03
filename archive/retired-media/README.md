# Retired media

64 files (37.0 MB) moved out of `public/` on 2026-10-03.

## Why

These were superseded as the site was reworked: animated WebP clips replaced by
h264 video, stills reshot from the 4K originals, gallery sections merged, and a
few images simply dropped from the pages that used them. Nothing was deleted.
They are still in git, still in history, and still restorable.

## Why they are here and not in `public/`

Anything under `public/` is uploaded and served on every deploy, so 37 MB of
superseded files rode along with each one. `archive/` is excluded from the
deployment by `.vercelignore`, so these stay in the repo without being shipped.

## Restoring one

```bash
git mv archive/retired-media/<path> public/images/<path>
```

Then reference it again from `src/data/portfolio.ts` or wherever it belongs.

## Checked before moving

Every file here is unreferenced by `src/`, `scripts/`, `prisma/` and the root docs.
Paths the code builds at runtime were resolved too, not just literal strings: the
eight `*-poster.webp` frames are derived by `posterFor()` in `src/components/Clip.tsx`
(`foo.mp4` -> `foo-poster.webp`) and were deliberately left in `public/`.

## The files

| Was served at | Now at | Size |
| --- | --- | --- |
| `/images/portfolio/cards/card-fronts.webp` | `archive/retired-media/portfolio/cards/card-fronts.webp` | 1679 K |
| `/images/portfolio/cards/custom-cards.webp` | `archive/retired-media/portfolio/cards/custom-cards.webp` | 1675 K |
| `/images/portfolio/tiles/board-tiles.webp` | `archive/retired-media/portfolio/tiles/board-tiles.webp` | 1599 K |
| `/images/portfolio/design/shapr3d-library.webp` | `archive/retired-media/portfolio/design/shapr3d-library.webp` | 1426 K |
| `/images/portfolio/tiles/board-panels-finished.webp` | `archive/retired-media/portfolio/tiles/board-panels-finished.webp` | 1409 K |
| `/images/portfolio/cards/card-printing-clip.webp` | `archive/retired-media/portfolio/cards/card-printing-clip.webp` | 1340 K |
| `/images/portfolio/tiles/hex-press-and-stacks.webp` | `archive/retired-media/portfolio/tiles/hex-press-and-stacks.webp` | 1211 K |
| `/images/portfolio/tiles/board-printing.webp` | `archive/retired-media/portfolio/tiles/board-printing.webp` | 1124 K |
| `/images/studio/dice-tumbler.webp` | `archive/retired-media/studio/dice-tumbler.webp` | 1081 K |
| `/images/portfolio/tiles/board-panel-printing.webp` | `archive/retired-media/portfolio/tiles/board-panel-printing.webp` | 1076 K |
| `/images/studio/hex-cut-and-stacked.webp` | `archive/retired-media/studio/hex-cut-and-stacked.webp` | 1073 K |
| `/images/portfolio/design/cad-3d-model.webp` | `archive/retired-media/portfolio/design/cad-3d-model.webp` | 1057 K |
| `/images/portfolio/filament/hospital-tags-clip.webp` | `archive/retired-media/portfolio/filament/hospital-tags-clip.webp` | 1036 K |
| `/images/portfolio/cards/cards-showcase.webp` | `archive/retired-media/portfolio/cards/cards-showcase.webp` | 1032 K |
| `/images/studio/card-backs.webp` | `archive/retired-media/studio/card-backs.webp` | 1020 K |
| `/images/studio/deck-printed-and-riffled.webp` | `archive/retired-media/studio/deck-printed-and-riffled.webp` | 993 K |
| `/images/portfolio/design/droideka-model.webp` | `archive/retired-media/portfolio/design/droideka-model.webp` | 975 K |
| `/images/portfolio/tiles/hex-press-run.webp` | `archive/retired-media/portfolio/tiles/hex-press-run.webp` | 955 K |
| `/images/studio/hex-stacks-pan.webp` | `archive/retired-media/studio/hex-stacks-pan.webp` | 943 K |
| `/images/portfolio/design/race-3d-model.webp` | `archive/retired-media/portfolio/design/race-3d-model.webp` | 885 K |
| `/images/studio/uv-tiles-printing.webp` | `archive/retired-media/studio/uv-tiles-printing.webp` | 868 K |
| `/images/portfolio/cards/deck-riffle.webp` | `archive/retired-media/portfolio/cards/deck-riffle.webp` | 808 K |
| `/images/studio/cards-printing-and-sheet.webp` | `archive/retired-media/studio/cards-printing-and-sheet.webp` | 804 K |
| `/images/portfolio/tiles/board-print-and-finish.webp` | `archive/retired-media/portfolio/tiles/board-print-and-finish.webp` | 799 K |
| `/images/portfolio/cards/panic-cards-printing.webp` | `archive/retired-media/portfolio/cards/panic-cards-printing.webp` | 776 K |
| `/images/portfolio/resin/race-model-showcase.webp` | `archive/retired-media/portfolio/resin/race-model-showcase.webp` | 723 K |
| `/images/portfolio/cards/panic-cards-spread.webp` | `archive/retired-media/portfolio/cards/panic-cards-spread.webp` | 702 K |
| `/images/studio/board-cutting.webp` | `archive/retired-media/studio/board-cutting.webp` | 689 K |
| `/images/studio/resin-minis-batch.webp` | `archive/retired-media/studio/resin-minis-batch.webp` | 609 K |
| `/images/studio/board-printing-uv.webp` | `archive/retired-media/studio/board-printing-uv.webp` | 600 K |
| `/images/studio/uv-cards-printing.webp` | `archive/retired-media/studio/uv-cards-printing.webp` | 584 K |
| `/images/studio/board-uv-and-double-sided.webp` | `archive/retired-media/studio/board-uv-and-double-sided.webp` | 537 K |
| `/images/studio/double-sided-board.webp` | `archive/retired-media/studio/double-sided-board.webp` | 519 K |
| `/images/studio/resin-plate-and-batch.webp` | `archive/retired-media/studio/resin-plate-and-batch.webp` | 517 K |
| `/images/portfolio/tiles/board-printing-head.webp` | `archive/retired-media/portfolio/tiles/board-printing-head.webp` | 470 K |
| `/images/portfolio/cards/game-deck-fan.webp` | `archive/retired-media/portfolio/cards/game-deck-fan.webp` | 458 K |
| `/images/portfolio/cards/cards-printing-uv.webp` | `archive/retired-media/portfolio/cards/cards-printing-uv.webp` | 449 K |
| `/images/studio/resin-plate.webp` | `archive/retired-media/studio/resin-plate.webp` | 429 K |
| `/images/portfolio/tiles/chopping-piece.webp` | `archive/retired-media/portfolio/tiles/chopping-piece.webp` | 364 K |
| `/images/portfolio/resin/resin-plate-lift.webp` | `archive/retired-media/portfolio/resin/resin-plate-lift.webp` | 301 K |
| `/images/portfolio/resin/miniatures-drying.webp` | `archive/retired-media/portfolio/resin/miniatures-drying.webp` | 246 K |
| `/images/portfolio/tiles/finished-tile-bundles.webp` | `archive/retired-media/portfolio/tiles/finished-tile-bundles.webp` | 192 K |
| `/images/portfolio/cards/prototype-card-backs.webp` | `archive/retired-media/portfolio/cards/prototype-card-backs.webp` | 180 K |
| `/images/portfolio/cards/keepsake-card-backs.webp` | `archive/retired-media/portfolio/cards/keepsake-card-backs.webp` | 154 K |
| `/images/portfolio/tiles/map-tiles.webp` | `archive/retired-media/portfolio/tiles/map-tiles.webp` | 153 K |
| `/images/portfolio/cards/client-deck-finished.webp` | `archive/retired-media/portfolio/cards/client-deck-finished.webp` | 121 K |
| `/images/studio/uv-card-printer.webp` | `archive/retired-media/studio/uv-card-printer.webp` | 115 K |
| `/images/studio/fdm-printer.webp` | `archive/retired-media/studio/fdm-printer.webp` | 113 K |
| `/images/portfolio/filament/race-award-medallion.webp` | `archive/retired-media/portfolio/filament/race-award-medallion.webp` | 99 K |
| `/images/studio/printer-bench.webp` | `archive/retired-media/studio/printer-bench.webp` | 99 K |
| `/images/portfolio/cards/role-to-reign-dice-cards.webp` | `archive/retired-media/portfolio/cards/role-to-reign-dice-cards.webp` | 89 K |
| `/images/studio/maker-holding-minis.webp` | `archive/retired-media/studio/maker-holding-minis.webp` | 88 K |
| `/images/portfolio/filament/race-award-number-one.webp` | `archive/retired-media/portfolio/filament/race-award-number-one.webp` | 87 K |
| `/images/studio/working-at-printers.webp` | `archive/retired-media/studio/working-at-printers.webp` | 86 K |
| `/images/portfolio/filament/race-award-tower.webp` | `archive/retired-media/portfolio/filament/race-award-tower.webp` | 86 K |
| `/images/portfolio/tiles/terrain-hexes-alt.webp` | `archive/retired-media/portfolio/tiles/terrain-hexes-alt.webp` | 74 K |
| `/images/portfolio/design/card-layout-artwork.webp` | `archive/retired-media/portfolio/design/card-layout-artwork.webp` | 70 K |
| `/images/portfolio/cards/prototyping-software.webp` | `archive/retired-media/portfolio/cards/prototyping-software.webp` | 70 K |
| `/images/portfolio/resin/miniatures-plate-hero.webp` | `archive/retired-media/portfolio/resin/miniatures-plate-hero.webp` | 63 K |
| `/images/portfolio/tiles/terrain-hexes-in-printer.webp` | `archive/retired-media/portfolio/tiles/terrain-hexes-in-printer.webp` | 48 K |
| `/images/portfolio/tiles/board-printing-still.webp` | `archive/retired-media/portfolio/tiles/board-printing-still.webp` | 32 K |
| `/images/portfolio/filament/3d-print-04.webp` | `archive/retired-media/portfolio/filament/3d-print-04.webp` | 30 K |
| `/images/portfolio/design/model-render.webp` | `archive/retired-media/portfolio/design/model-render.webp` | 11 K |
| `/images/portfolio/tiles/chopping-piece-still.webp` | `archive/retired-media/portfolio/tiles/chopping-piece-still.webp` | 10 K |
