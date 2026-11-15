// Checks on the drawn versions of each ladder, run by
// scripts/draw-ladders.mjs before it writes anything: measured on the
// pictures it generated, with Clipper2 (ladder-geometry.mjs), so a rule of
// docs/journey-design.md ("Rules for drawing a ladder") that can be
// measured no longer depends on looking. Own work, CC BY-SA 4.0 like
// content/.
import { area, bounds, box, minus, oval, stroke, union, within } from './ladder-geometry.mjs';

/**
 * Each version must cover at least this much more area than the one before
 * (5 %: a tall, thin version such as a well sweep grows less in area than
 * it looks).
 */
export const GROWTH = 1.05;
/** The build's box; a build on water reaches into it down to the edge (rule 6). */
const BOX = { left: 0, top: 4, right: 120, base: 74, water: 80 };
/**
 * Ladders measured but not held to the checks while they are being retired
 * (their problems print as warnings). Empty: Crossing was retired by #128.
 */
export const RETIRING = new Set();
const EPS = 0.05;
/** The picture checker's limit (ART_MAX_BYTES in packages/engine/src/art-check.ts). */
const MAX_BYTES = 4096;
/** Roles that are the thing itself; `tint` and `tint-strong` are ground and water. */
const THING = new Set(['fg', 'bg', 'accent', 'dim']);

const attrs = (tag) =>
  Object.fromEntries([...tag.matchAll(/([a-z-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
const num = (v) => Number(v ?? 0);

/**
 * Path data with M, L, H, V, C, h, v, a and Z (what the generator writes for
 * builds); curves become points. An arc must be half an ellipse along x, as
 * the generator writes ellipses.
 */
const pathRings = (d) => {
  const rings = [];
  let ring = [];
  let [x, y] = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLHVChvaZ])([^MLHVChvaZ]*)/g)) {
    const v =
      args.trim() === ''
        ? []
        : args
            .trim()
            .split(/[\s,]+/)
            .map(Number);
    if (cmd === 'M' || cmd === 'L') {
      for (let i = 0; i < v.length; i += 2) {
        if (cmd === 'M' && i === 0 && ring.length) rings.push(ring);
        if (cmd === 'M' && i === 0) ring = [];
        [x, y] = [v[i], v[i + 1]];
        ring.push([x, y]);
      }
    } else if (cmd === 'H' || cmd === 'h') {
      x = cmd === 'H' ? v[0] : x + v[0];
      ring.push([x, y]);
    } else if (cmd === 'V' || cmd === 'v') {
      y = cmd === 'V' ? v[0] : y + v[0];
      ring.push([x, y]);
    } else if (cmd === 'C') {
      for (let i = 0; i + 5 < v.length; i += 6) {
        const [x1, y1, x2, y2, x3, y3] = v.slice(i, i + 6);
        for (let s = 1; s <= 12; s += 1) {
          const t = s / 12;
          const u = 1 - t;
          ring.push([
            u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          ]);
        }
        [x, y] = [x3, y3];
      }
    } else if (cmd === 'a') {
      for (let i = 0; i + 6 < v.length; i += 7) {
        const [rx, ry, , , sweep, dx, dy] = v.slice(i, i + 7);
        if (Math.abs(dy) > 0.01 || Math.abs(Math.abs(dx) - 2 * rx) > 0.11)
          throw new Error(`arc is not half an ellipse: ${v.slice(i, i + 7).join(' ')}`);
        const [cx, start] = [x + dx / 2, dx > 0 ? Math.PI : 0];
        for (let s = 1; s <= 24; s += 1) {
          const t = start + (sweep ? 1 : -1) * Math.PI * (s / 24);
          ring.push([cx + rx * Math.cos(t), y + ry * Math.sin(t)]);
        }
        x += dx;
      }
    } else if (cmd === 'Z') {
      if (ring.length) rings.push(ring);
      ring = [];
    }
  }
  if (ring.length) rings.push(ring);
  return rings;
};

/** The ring turned so that its signed area is positive. */
const clockwise = (ring) => {
  const turn = ring.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    return sum + x1 * y2 - x2 * y1;
  }, 0);
  return turn < 0 ? [...ring].reverse() : ring;
};
/** The shapes of a picture in drawing order: { role, shape }. */
export const shapesOf = (source) =>
  [...source.matchAll(/<(rect|ellipse|polygon|path)\b([^>]*)\/>/g)]
    .map(([, name, rest]) => {
      const a = attrs(rest);
      if (name === 'path' && /[^MLHVChvaZ0-9.,\s-]/.test(a.d))
        throw new Error(`path with curves cannot be measured: ${a.d.slice(0, 30)}`);
      const shape =
        name === 'rect'
          ? box(num(a.x), num(a.y), num(a.width), num(a.height))
          : name === 'ellipse'
            ? oval(num(a.cx), num(a.cy), num(a.rx), num(a.ry))
            : name === 'polygon'
              ? [
                  a.points
                    .trim()
                    .split(/\s+/)
                    .map((p) => p.split(',').map(Number)),
                ]
              : pathRings(a.d);
      return { role: a.class, shape, evenodd: a['fill-rule'] === 'evenodd' };
    })
    // a path of several shapes in one colour (compact in draw-ladders.mjs)
    // is measured shape by shape; one with holes stays whole
    .flatMap((s) =>
      s.evenodd || s.shape.length < 2 ? [s] : s.shape.map((ring) => ({ ...s, shape: [ring] })),
    )
    // a single filled ring looks the same either way round; turned one way,
    // so rings drawn either way do not cancel each other in a union
    .map((s) => (s.shape.length === 1 ? { ...s, shape: [clockwise(s.shape[0])] } : s));

/** What a version covers as a thing (its silhouette), without its threshold stone. */
const silhouette = (shapes, stone) =>
  minus(union(...shapes.filter((s) => THING.has(s.role)).map((s) => s.shape)), stone ?? []);

/**
 * Problems of one ladder's versions, as messages; `pictures` maps a picture's
 * name to its SVG text. The threshold stone is the box between the ladder's
 * one way point pair and the base line (a home, a garden, a well).
 */
export const ladderGeometryProblems = (name, ladder, pictures) => {
  const problems = [];
  const [way] = ladder.ways ?? [];
  const stone =
    ladder.ways?.length === 1
      ? box(way[0][0], BOX.base, way[1][0] - way[0][0], way[0][1] - BOX.base)
      : undefined;
  let before = 0;
  ladder.versions.forEach(({ art }, i) => {
    const source = pictures[art];
    if (source === undefined) {
      problems.push(`${name}: no picture ${art}`);
      return;
    }
    const bytes = new TextEncoder().encode(source).length;
    if (bytes > MAX_BYTES) problems.push(`${art}: ${bytes} bytes, more than ${MAX_BYTES}`);
    const shapes = shapesOf(source);
    const thing = silhouette(shapes, stone);
    const [x0, y0, x1, y1] = bounds(thing) ?? [0, 0, 0, 0];
    const base = ladder.water ? BOX.water : BOX.base;
    if (x0 < BOX.left - EPS || x1 > BOX.right + EPS || y0 < BOX.top - EPS || y1 > base + EPS)
      problems.push(
        `${art}: outside the box 0–120 × 4–${base} (${[x0, y0, x1, y1].map((v) => v.toFixed(1)).join(', ')})`,
      );
    const covered = area(thing);
    if (i > 0 && covered < before * GROWTH)
      problems.push(
        `${art}: covers ${covered.toFixed(0)}, not ${Math.round((GROWTH - 1) * 100)} % more than version ${i} (${before.toFixed(0)})`,
      );
    before = covered;
    if (stone) {
      const stoneParts = shapes.filter(
        (s) => THING.has(s.role) && area(minus(s.shape, stone)) < EPS,
      );
      const over = shapes.filter(
        (s) => THING.has(s.role) && !stoneParts.includes(s) && area(within(s.shape, stone)) > EPS,
      );
      if (over.length > 0) problems.push(`${art}: ${over.length} shapes cover the threshold stone`);
    }
  });
  return problems;
};

// ---- the place: its signs, flowers and the lit lantern (#131) ---------------

/** Every layout the Valley's check measures (art-valley-check.ts): 1–6 places on every choice of sides, 7–12 alternating. */
const LAYOUT_SIDES = (() => {
  const all = [];
  for (let n = 1; n <= 6; n += 1)
    for (let m = 0; m < 1 << n; m += 1)
      all.push(Array.from({ length: n }, (_, i) => ((m >> i) & 1 ? 'left' : 'right')));
  for (let n = 7; n <= 12; n += 1)
    for (const first of [0, 1])
      all.push(Array.from({ length: n }, (_, i) => ((i + first) % 2 ? 'left' : 'right')));
  return all;
})();
/** The doorstep's zone in the frame: nothing in front of it. */
const DOORSTEP = box(50, 74, 20, 26);
/** The threshold stone, which the lantern leaves free. */
const STONE = box(53, 74, 14, 3.5);
/** Room kept between a place's pictures and the edge of the path. */
const PATH_GAP = 2;
const ROLES = {
  flowers: new Set(['fg', 'bg', 'tint-strong', 'accent']),
};

/** A shape moved into the scene: frame units → scene. */
const toScene = (shape, slot) =>
  shape.map((ring) => ring.map(([x, y]) => [slot.x + x * slot.scale, slot.y + y * slot.scale]));
const rectShape = (b) => box(b.x, b.y, b.width, b.height);

/**
 * Problems of the place's pictures (content/art/place.json): `pictures`
 * maps a picture's name to its SVG text, `ladders` a ladder's name to its
 * file. Measured in the frame and in the Valley's layout (`valleyLayout`)
 * for every number of places and choice of sides, at 360 and 720 wide.
 */
export const placeProblems = (place, pictures, ladders, valleyLayout) => {
  const problems = [];
  const [fx, fy, fw, fh] = place.frame;
  const frame = box(fx, fy, fw, fh);
  const shapesNamed = (name) => {
    const source = pictures[name];
    if (source === undefined) {
      problems.push(`place: no picture ${name}`);
      return [];
    }
    const bytes = new TextEncoder().encode(source).length;
    if (bytes > MAX_BYTES) problems.push(`${name}: ${bytes} bytes, more than ${MAX_BYTES}`);
    return shapesOf(source);
  };
  const union1 = (name) => union(...shapesNamed(name).map((s) => s.shape));
  const flowers = shapesNamed(place.flowers);
  const layers = [{ name: place.flowers, kind: 'flowers', shapes: flowers }];
  const lanterns = { right: union1(place.lantern.right), left: union1(place.lantern.left) };
  for (const [side, lanternShape] of Object.entries(lanterns)) {
    const name = `lantern (${side})`;
    if (area(minus(lanternShape, frame)) > EPS) problems.push(`${name}: outside the frame`);
    if (area(within(lanternShape, STONE)) > EPS)
      problems.push(`${name}: covers the threshold stone`);
    if (area(within(lanternShape, DOORSTEP)) > EPS)
      problems.push(`${name}: in front of the doorstep`);
  }
  // the lantern stands towards the path: left of the box on the right of the path
  if ((bounds(lanterns.right)?.[2] ?? 0) > 0 + EPS || (bounds(lanterns.left)?.[0] ?? 0) < 120 - EPS)
    problems.push('lantern: not beside the box towards the path');
  // nothing overlaps the thing, whichever version of whichever ladder stands
  const things = Object.values(ladders).flatMap((ladder) =>
    ladder.versions
      .filter(({ art }) => pictures[art] !== undefined)
      .map(({ art }) => ({ art, shape: silhouette(shapesOf(pictures[art])) })),
  );
  const clearOfThings = (name, shape) => {
    for (const { art, shape: thing } of things)
      if (area(within(shape, thing)) > EPS) {
        problems.push(`${name}: overlaps ${art}`);
        return;
      }
  };
  for (const [side, shape] of Object.entries(lanterns)) clearOfThings(`lantern (${side})`, shape);
  for (const { name, kind, shapes } of layers) {
    const all = union(...shapes.map((s) => s.shape));
    const wrong = shapes.filter((s) => !ROLES[kind].has(s.role)).map((s) => s.role);
    if (wrong.length > 0)
      problems.push(`${name}: roles ${[...new Set(wrong)].join(', ')} are not for ${kind}`);
    if (area(minus(all, frame)) > EPS)
      problems.push(`${name}: outside the frame ${fx} ${fy} ${fw} ${fh}`);
    if (area(within(all, DOORSTEP)) > EPS) problems.push(`${name}: in front of the doorstep`);
    clearOfThings(name, all);
  }
  // nothing hides the marker: the lantern, drawn over it, leaves every
  // marker element of every ladder free, mapped as the place's pages draw
  // it (packages/ui/src/ui/valley/model.ts, markerPieces): the posts' span
  // fills the thing's box, their feet on its lower edge
  for (const [ladderName, ladder] of Object.entries(ladders)) {
    const kind = ladder.marker;
    const markers = ladder.pictures.filter((q) => q.slot === 'marker');
    const loose = markers.filter((q) => q.part !== 'cord');
    const left = Math.min(...loose.map((q) => q.x));
    const right = Math.max(...loose.map((q) => q.x + q.width));
    const base = Math.max(...loose.map((q) => q.y + q.height));
    const k = 120 / (right - left);
    for (const p of markers) {
      const art =
        p.part === 'cord' ? p.art : `marker-${kind}-${p.part}${p.part === 'bead' ? '-lit' : ''}`;
      const source = pictures[art];
      if (source === undefined) continue;
      const [, , vw] = /viewBox="([^"]+)"/.exec(source)[1].split(' ').map(Number);
      const unit = p.width / vw;
      const shape = union(
        ...shapesOf(source).map((s) =>
          s.shape.map((ring) =>
            ring.map(([x, y]) => [(p.x + x * unit - left) * k, 80 + (p.y + y * unit - base) * k]),
          ),
        ),
      );
      for (const [side, lantern] of Object.entries(lanterns))
        if (area(within(shape, lantern)) > EPS)
          problems.push(`lantern (${side}): covers ${ladderName}'s marker (${p.part} ${p.order})`);
    }
  }
  // in the Valley: inside the scene, clear of the path and of every other place
  const seen = new Set();
  for (const width of [360, 720])
    for (const sides of LAYOUT_SIDES) {
      const layout = valleyLayout({ sides, width, height: width * 2 });
      const scene = box(0, 0, layout.width, layout.height);
      // the path as drawn, with a little room on both sides
      const way = stroke(
        layout.path.flatMap((c) =>
          Array.from({ length: 24 }, (_, s) => {
            const t = s / 24;
            const u = 1 - t;
            const mix = (k) =>
              u * u * u * c.from[k] +
              3 * u * u * t * c.c1[k] +
              3 * u * t * t * c.c2[k] +
              t * t * t * c.to[k];
            return [mix('x'), mix('y')];
          }),
        ),
        layout.pathWidth + 2 * PATH_GAP * layout.unit,
      );
      const placed = layout.places.map((p) => {
        const own = [
          lanterns[p.side],
          ...layers.map((l) => union(...l.shapes.map((s) => s.shape))),
        ].map((shape) => toScene(shape, p.slot));
        return { p, own, all: union(...own) };
      });
      placed.forEach(({ p, all }, i) => {
        const report = (what) => {
          const key = `${what} (${sides.length} places)`;
          if (seen.has(key)) return;
          seen.add(key);
          problems.push(`place ${i + 1} of ${sides.join(',')} at ${width}: ${what}`);
        };
        if (area(minus(all, scene)) > EPS) report('leaves the scene');
        if (area(within(all, way)) > EPS) report('crosses the path');
        placed.forEach((other, j) => {
          if (j === i) return;
          const theirs = union(rectShape(other.p.slot), rectShape(other.p.name), other.all);
          if (area(within(all, theirs)) > EPS) report(`overlaps place ${j + 1}`);
        });
        if (area(within(all, rectShape(p.name))) > EPS) report('covers its own name');
      });
    }
  return problems;
};
