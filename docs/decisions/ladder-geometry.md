---
type: Decision Record
title: Ladder pictures are built with a geometry library and measured
description: Go (owner, 2026-11-15) - scripts/draw-ladders.mjs builds outlines, cut-outs and clipped stonework with Clipper2 (clipper2-ts, BSL-1.0, development only) and measures every version before it writes - inside the box, at least 5 % more area than the one before, the threshold stone free; a test measures the committed pictures.
tags: [pictures, art, ladders, tooling, dependencies]
generated: { by: claude-code/2.1.322, at: 2026-11-15 }
sources:
  - '[^128]: https://github.com/nexumia-de/quest-arc/issues/128'
  - '[^134]: https://github.com/nexumia-de/quest-arc/pull/134'
  - '[^clipper2-ts]: https://github.com/countertype/clipper2-ts (2.0.1, LICENSE in the package)'
---

# Ladder pictures are built with a geometry library and measured

## Question

Drawing Garden and Well (#128[^128], #134[^134]) took many rounds for
faults that were geometry, not design. The picture checker allows only
filled shapes, so an outline is an `fg` shape with a smaller `bg` shape on
top. Done by hand, that has no general way to join shapes, cut holes or
clip:

- shrinking a polygon with inward corners gave spikes (the first hedge
  read as battlements);
- the well house's arch was cut out with an even-odd path whose cut-out
  reached below the wall and drew a band;
- stones were kept out of the arch by computing its curve by hand.

Whether a version was larger than the one before, inside its box and clear
of the threshold stone was only ever checked by eye.

## Decision

- `scripts/ladder-geometry.mjs` builds shapes with Clipper2 (the
  TypeScript port `clipper2-ts`[^clipper2-ts], exact pin 2.0.1, BSL-1.0,
  no dependencies): outlines by offsetting with mitred corners, cut-outs
  by subtraction, stonework clipped to its wall (`masonry`).
- `scripts/ladder-checks.mjs` measures each version of each ladder from
  the pictures the generator made; `scripts/draw-ladders.mjs` writes
  nothing while one breaks a rule:
  - the thing (roles `fg`, `bg`, `accent`, `dim`) stays in the box
    0–120 × 4–74 (a build on water down to 80, its water);
  - it covers at least 5 % more area than the version before (a tall,
    thin version such as a well sweep grows less in area than it looks,
    so the bar is low; it catches a version that is not larger);
  - no shape but the threshold stone covers the threshold stone;
  - no picture is larger than the picture checker's 4 KB (added with
    #135, after a redraw went over it unnoticed).
- `packages/engine/test/art-geometry.test.ts` measures the committed
  pictures the same way, so `npm run journeys` and CI catch a picture
  changed by other means.
- A ladder being retired can be listed in `RETIRING`: it is measured and
  only warned about. The set is empty: Crossing, the ladder it was made
  for (its plank bridge covered 1 % more than the log), was removed by
  #128.

## Writing the pictures small

Added with #135, when Garden 5 came out at 5.8 KB:

- `compact` writes every run of plain shapes of one role (rectangles
  without rounded corners, ellipses as two half arcs, polygons), all
  turned clockwise, as one path; `layered` draws objects that do not
  overlap layer by layer, so their outlines and their fills each become
  one run. The picture stays the same: every build, setting and marker
  picture but Garden rendered at four times its size shows no difference
  against `main`.
- Rings from the geometry library and rectangles are written with steps
  along one axis (`H`, `V`) where they run straight; absolute, because
  the picture checker reads the corners of absolute commands only (the
  way points).
- The measuring reads half-ellipse arcs and turns every single ring the
  same way before it unites them. Before, a ring drawn the other way round
  cancelled part of another in the union, so some versions were measured
  too small (the retired Crossing's log: 1,627 instead of 1,704).

## Considered

- `polygon-clipping` (MIT): joins and cuts, but no offsetting, which the
  outlines need.
- `paper` (MIT): keeps curves, but its operations on curves are less
  reliable, it has no offsetting and needs a DOM shim in Node.
- `clipper2-js`: no licence file in the package, and Angular 15 as peer
  dependencies.
- `svgo`: files are already below 4 KB, and it could write forms the
  picture checker refuses.
- Rendering and comparing pixels in the check: the existing Playwright
  serves the owner's review; the checks need numbers, not pictures.

## Consequences

- Moving the existing helpers changed no picture visibly. A pixel
  comparison at four times the build size showed two kinds of change:
  - The stones of the well house now stop exactly at the arch's curve
    (before, at steps sampled by hand).
  - The checks' first findings were fixed: Garden 5's hedge reached one
    unit past the box, and Well 1's front stones half a unit below the
    base line.
- Curves become points inside the geometry library, so a shape built
  there is written as a polygon or a path of straight lines; the 4 KB
  limit still applies, and the generator refuses a picture above it (largest build 3,915 bytes, Garden 3, after #135).
- Not measured: the thinnest line at 60 × 40 (joints and ropes are
  meant to be thin) and whether a version reads as what it is; that stays
  the owner's review.
