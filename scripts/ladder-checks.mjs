// Checks on the drawn versions of each ladder, run by
// scripts/draw-ladders.mjs before it writes anything: measured on the
// pictures it generated, with Clipper2 (ladder-geometry.mjs), so a rule of
// docs/journey-design.md ("Rules for drawing a ladder") that can be
// measured no longer depends on looking. Own work, CC BY-SA 4.0 like
// content/.
import { area, bounds, box, minus, oval, union, within } from './ladder-geometry.mjs';

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

/** The doorstep's column: nothing of the marker stands in front of the threshold stone. */
const DOORSTEP = { left: 51, right: 69 };

/**
 * Problems of the marker's flowers (#152), as messages: `flowers` lists
 * each flower's feet ([x, y] in build units) in the order they grow,
 * `yard` the thing's ground ([cx, cy, rx, ry]); a flower's pictures are
 * `marker-flower-<k>` (in bud) and `marker-flower-<k>-open`. Each stands
 * with its feet on the yard, inside the build's box (so beside the path,
 * never on it), clear of the doorstep's column, apart from every other
 * flower in both forms, and within the picture checker's size; they grow
 * from the doorstep outwards.
 */
export const flowerProblems = (flowers, yard, pictures) => {
  const problems = [];
  const [cx, cy, rx, ry] = yard;
  const shapes = flowers.map((_, i) =>
    ['', '-open'].map((form) => {
      const art = `marker-flower-${i + 1}${form}`;
      const source = pictures[art];
      if (source === undefined) {
        problems.push(`no picture ${art}`);
        return [];
      }
      const bytes = new TextEncoder().encode(source).length;
      if (bytes > MAX_BYTES) problems.push(`${art}: ${bytes} bytes, more than ${MAX_BYTES}`);
      const shape = union(...shapesOf(source).map((s) => s.shape));
      const [x0, y0, x1, y1] = bounds(shape) ?? [0, 0, 0, 0];
      if (x0 < BOX.left - EPS || x1 > BOX.right + EPS || y0 < BOX.top - EPS || y1 > 80 + EPS)
        problems.push(`${art}: outside the build's box`);
      if (area(within(shape, box(DOORSTEP.left, 0, DOORSTEP.right - DOORSTEP.left, 80))) > EPS)
        problems.push(`${art}: stands in front of the doorstep`);
      return shape;
    }),
  );
  flowers.forEach(([x, y], i) => {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1)
      problems.push(`marker-flower-${i + 1}: its feet (${x}, ${y}) are not on the yard`);
    const before = flowers[i - 1];
    if (before && Math.abs(x - cx) < Math.abs(before[0] - cx))
      problems.push(`marker-flower-${i + 1}: grows nearer the doorstep than the one before`);
    for (let j = 0; j < i; j += 1)
      for (const a of shapes[i])
        for (const b of shapes[j])
          if (a.length && b.length && area(within(a, b)) > EPS)
            problems.push(`marker-flower-${i + 1} overlaps marker-flower-${j + 1}`);
  });
  return problems;
};
