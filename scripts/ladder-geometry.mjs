// Geometry for scripts/draw-ladders.mjs: outlines, cut-outs and clipping
// with Clipper2 (`clipper2-ts`, BSL-1.0, development only), so shapes join,
// keep their holes and stop at edges by construction instead of by
// hand-computed curves. A shape is a list of rings (outer rings and holes),
// each ring a list of [x, y]. Own work, CC BY-SA 4.0 like content/.
import { Clipper, EndType, FillRule, JoinType } from 'clipper2-ts';

const PRECISION = 3; // decimals Clipper keeps
const MITER_LIMIT = 4; // sharp corners stay sharp, slivers are cut
const toD = (shape) => shape.map((ring) => ring.map(([x, y]) => ({ x, y })));
const fromD = (paths) => paths.map((ring) => ring.map(({ x, y }) => [x, y]));

/** The shape grown by `d` (shrunk if negative), corners mitred. */
export const grow = (shape, d) =>
  fromD(
    Clipper.inflatePathsD(toD(shape), d, JoinType.Miter, EndType.Polygon, MITER_LIMIT, PRECISION),
  );
/** An open line of points drawn `d` wide, with round ends. */
export const stroke = (points, d) =>
  fromD(
    Clipper.inflatePathsD(
      [points.map(([x, y]) => ({ x, y }))],
      d / 2,
      JoinType.Round,
      EndType.Round,
      MITER_LIMIT,
      PRECISION,
    ),
  );
/** Everything any of the shapes covers. */
export const union = (...shapes) =>
  fromD(Clipper.unionD(toD(shapes.flat()), FillRule.NonZero, PRECISION));
/** What `a` covers and `b` does not. */
export const minus = (a, b) =>
  fromD(Clipper.differenceD(toD(a), toD(b), FillRule.NonZero, PRECISION));
/** What both cover. */
export const within = (a, b) =>
  fromD(Clipper.intersectD(toD(a), toD(b), FillRule.NonZero, PRECISION));
/** Covered area. */
export const area = (shape) => Math.abs(Clipper.areaPathsD(toD(union(shape))));
/** [minX, minY, maxX, maxY] of a shape, or null if it is empty. */
export const bounds = (shape) => {
  const points = shape.flat();
  if (points.length === 0) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

/** A rectangle as a shape. */
export const box = (x, y, w, h) => [
  [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ],
];
/** An ellipse as a shape, `steps` corners round. */
export const oval = (cx, cy, rx, ry, steps = 48) => [
  Array.from({ length: steps }, (_, i) => {
    const a = (2 * Math.PI * i) / steps;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  }),
];
