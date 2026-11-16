/**
 * The Valley's place pieces, laid out by rule (#114 decisions 2, 7 and 8;
 * #127; docs/journey-design.md, "The place piece"). Pure: the same numbers
 * give the same scene in every host. One path runs through the day, in at
 * the top and out at the bottom; each place is a bend of it with the
 * build's slot wholly on the thing's side, a bay (the path widening on that
 * side only) under the thing's doorstep, and the name on the free side.
 *
 * The rule's numbers are for a scene 360 units wide; a wider scene scales
 * them, so at 720 and wider the same scene is drawn larger, not
 * rearranged. No file of the engine imports this one, so build scripts can
 * load it directly.
 */

export type Side = 'left' | 'right';

export interface ValleyInput {
  /** The side of the path each place's thing stands on, in the order of the day. */
  sides: readonly Side[];
  /**
   * How many things stand at each place (1 to 3, game rules §8), in the
   * order of `sides`; one where absent. The second and third stand behind
   * the first (#151).
   */
  things?: readonly number[];
  /** The scene's width (360 on a phone). */
  width?: number;
  /** The height six places fill (720 on a phone); fewer places fill it too, more scroll. */
  height?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One cubic Bézier segment of the path's centre line. */
export interface Cubic {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface ValleyPiece {
  side: Side;
  /** The band of the scene this place owns, full width, from joint to joint. */
  piece: Box;
  /** The path's centre line at the place, the bend away from the thing. */
  bend: Point;
  /** Where the path crosses the piece's upper and lower edge. */
  joints: { top: Point; bottom: Point };
  /** The path within the piece: top joint to bend, bend to bottom joint. */
  path: [Cubic, Cubic];
  /** The build's box (view box 0 0 120 80, base line y = 74) in scene units. */
  slot: Box & { scale: number };
  /**
   * Every thing's box at the place, front to back: the first is `slot`; the
   * second and third stand behind it (#151), higher, slightly smaller, on
   * the side away from the path, partly hidden by the ones in front.
   */
  things: (Box & { scale: number })[];
  /** The ground patch under each thing behind the first (`things[1]` on), drawn like the bay. */
  patches: Ellipse[];
  /**
   * The thing's ground: the slot with `plotNear` build units of room beside
   * it towards the path (the lit lantern), as high as the slot.
   */
  plot: Box;
  /** The path widening on the thing's side: from the centre line to the slot's far side. */
  bay: Ellipse;
  /** Where the thing's threshold (x = 60, y = 74 of the build) meets the bay. */
  doorstep: Point;
  /** The name on the free side at the height of the bay; two lines at most, then an ellipsis. */
  name: Box & { align: 'left' | 'right'; lines: 2; size: number; lineHeight: number };
}

export interface ValleyLayout {
  width: number;
  /** The scene's height: the given height, or longer with more than six places. */
  height: number;
  /** Scene units per unit of the 360-wide rule. */
  unit: number;
  /** The path's width; it is drawn as a stroke of the centre line. */
  pathWidth: number;
  /** The whole centre line, top edge to bottom edge. */
  path: Cubic[];
  places: ValleyPiece[];
}

/** The rule's numbers, for a scene 360 wide. */
export const VALLEY = {
  width: 360,
  height: 720,
  /** Places that fill the height; with more the scene is longer. */
  fill: 6,
  /** The bend lies `bendBase + bendPerPlace × n` to the side, at most `bendMax`. */
  bendBase: 20,
  bendPerPlace: 6,
  bendMax: 56,
  pathWidth: 22,
  /** A slot's near edge stays this far from the path's centre line. */
  clearance: 15,
  /** How far the curve's control points reach, as a share of a segment's height. */
  smooth: 0.5,
  /** Space kept free at the scene's sides. */
  edge: 8,
  /**
   * Room beside the slot towards the path, in build units, for the lit
   * lantern, which stands apart from the thing (#131, owner 2026-11-15).
   */
  plotNear: 14,
  /** The largest slot, in scene units per build unit (as the setting's slot). */
  maxScale: 1.75,
  /** The bay's half height and the base line's drop below the bend, in build units. */
  bayHalfHeight: 14,
  baseDrop: 4,
  /**
   * The things behind the first (#151), in the first's build units: their
   * size, how far their base line rises above the first's, and the edge of
   * the first's box they keep to (`outer`, away from the path, or `inner`;
   * an inner one slides outwards where the path comes nearer than
   * `clearance`). They stand side by side in a row behind the first, their
   * feet above its highest version's roof, so a small growing version and
   * its flowers stay in view: the second at the outer edge, the third at
   * the other edge (owner, round 2: about two thirds of the first, side by
   * side, neither covering the other).
   */
  behind: [
    { scale: 0.64, rise: 72, edge: 'outer' },
    { scale: 0.64, rise: 72, edge: 'inner' },
  ],
  /**
   * Free room between the second and third, in the first's build units;
   * where the path leaves less than two things and this, both are drawn
   * smaller.
   */
  besideGap: 4,
  /**
   * Each thing behind stands on its own ground patch, drawn like the bay
   * (owner, round 2): an ellipse under its base line, this share of its
   * box's width across and `patchHalfHeight` of its own build units high on
   * each side.
   */
  patchWidth: 1,
  patchHalfHeight: 14,
  /** The patches keep this much room from the path's edge, in scene units at 360 wide. */
  patchGap: 3,
  /**
   * The lit lantern stands from this height of the build's box down (build
   * units): the lantern's room beside the slot, kept free of the things
   * behind.
   */
  lanternTop: 48,
  /** At most this many things at a place (game rules §8, THINGS_PER_PLACE). */
  things: 3,
  /** The marker stands in this many build units at the foot of a thing's box. */
  markerBand: 20,
  /** The name's text size and line height. */
  nameSize: 14,
  nameLine: 18,
} as const;

const BUILD = { width: 120, height: 80, base: 74, door: 60 } as const;
const SAMPLES = 48;

const at = (c: Cubic, t: number): Point => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c.from.x + b * c.c1.x + d * c.c2.x + e * c.to.x,
    y: a * c.from.y + b * c.c1.y + d * c.c2.y + e * c.to.y,
  };
};

/** The S-curve between two points, vertical where it starts and ends. */
const curve = (from: Point, to: Point): Cubic => {
  const k = (to.y - from.y) * VALLEY.smooth;
  return { from, c1: { x: from.x, y: from.y + k }, c2: { x: to.x, y: to.y - k }, to };
};

/** A cubic split at t (de Casteljau). */
const split = (c: Cubic, t: number): [Cubic, Cubic] => {
  const lerp = (p: Point, q: Point): Point => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
  });
  const ab = lerp(c.from, c.c1);
  const bc = lerp(c.c1, c.c2);
  const cd = lerp(c.c2, c.to);
  const abc = lerp(ab, bc);
  const bcd = lerp(bc, cd);
  const m = lerp(abc, bcd);
  return [
    { from: c.from, c1: ab, c2: abc, to: m },
    { from: m, c1: bcd, c2: cd, to: c.to },
  ];
};

/** The parameter where a cubic whose y rises along it reaches a height. */
const tAtY = (c: Cubic, y: number): number => {
  let [lo, hi] = [0, 1];
  for (let k = 0; k < 50; k += 1) {
    const mid = (lo + hi) / 2;
    if (at(c, mid).y < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

/** Points along the centre line, densely enough to measure against. */
export const pathPoints = (path: readonly Cubic[]): Point[] =>
  path.flatMap((c, i) =>
    Array.from({ length: SAMPLES + (i === path.length - 1 ? 1 : 0) }, (_, s) => at(c, s / SAMPLES)),
  );

/**
 * How far a box spanning y0 … y1 may reach towards the path and still stay
 * `gap` from every point of it: the least x on the right of the path, the
 * greatest on the left.
 */
const reach = (points: readonly Point[], y0: number, y1: number, gap: number, side: Side) => {
  let limit = side === 'right' ? -Infinity : Infinity;
  for (const p of points) {
    const dy = p.y < y0 ? y0 - p.y : p.y > y1 ? p.y - y1 : 0;
    if (dy >= gap) continue;
    const dx = Math.sqrt(gap * gap - dy * dy);
    limit = side === 'right' ? Math.max(limit, p.x + dx) : Math.min(limit, p.x - dx);
  }
  return limit;
};

/**
 * The slot of a place at a scale, with its plot (the slot and the room beside
 * it) hugging the path, or null if it does not fit.
 */
const slotAt = (
  points: readonly Point[],
  bend: Point,
  side: Side,
  scale: number,
  scene: { width: number; height: number; unit: number },
  vertical: boolean,
): { slot: Box; plot: Box } | null => {
  const width = BUILD.width * scale;
  const height = BUILD.height * scale;
  const y = bend.y + VALLEY.baseDrop * scale - BUILD.base * scale;
  const gap = VALLEY.clearance * scene.unit;
  const edge = VALLEY.edge * scene.unit;
  const reached = reach(points, y, y + height, gap, side);
  const plotWidth = width + VALLEY.plotNear * scale;
  const px = side === 'right' ? reached : reached - plotWidth;
  if (px < edge || px + plotWidth > scene.width - edge) return null;
  if (vertical && (y < 0 || y + height > scene.height)) return null;
  const x = side === 'right' ? px + plotWidth - width : px;
  return { slot: { x, y, width, height }, plot: { x: px, y, width: plotWidth, height } };
};

const bendOf = (side: Side, n: number, width: number, unit: number, y: number): Point => {
  const offset = Math.min(VALLEY.bendBase + VALLEY.bendPerPlace * n, VALLEY.bendMax) * unit;
  return { x: width / 2 + (side === 'right' ? -offset : offset), y };
};

const other = (side: Side): Side => (side === 'right' ? 'left' : 'right');

/** The largest scale up to `max` at which `fits` holds (fits is monotonic). */
const largest = (max: number, fits: (scale: number) => boolean): number => {
  if (fits(max)) return max;
  let [lo, hi] = [0, max];
  for (let k = 0; k < 40; k += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
};

/**
 * The centre line for bends shifted down by `shift`: one S-curve from bend
 * to bend, with a bend before the first and after the last as if the sides
 * went on alternating, cut at the scene's top and bottom edge. Returns the
 * path cut into the places' pieces (top joint, bend, bottom joint).
 */
const pathFor = (
  sides: readonly Side[],
  width: number,
  unit: number,
  pitch: number,
  sceneHeight: number,
  shift: number,
  extra: readonly number[] = [],
) => {
  const n = sides.length;
  // room added above place i (and so to everything below it)
  const above = (i: number) => extra.slice(0, Math.max(0, i + 1)).reduce((a, b) => a + b, 0);
  const bendAt = (side: Side, i: number) =>
    bendOf(side, n, width, unit, (i + 0.5) * pitch + shift + above(i));
  const bends = sides.map(bendAt);
  const all = [
    bendAt(other(sides[0] as Side), -1),
    ...bends,
    bendAt(other(sides[n - 1] as Side), n),
  ];
  const segments = all.slice(1).map((to, i) => curve(all[i] as Point, to));
  // the first and last segment cut at the edges, the others at their middle
  const cut = segments.map((c, i) =>
    i === 0
      ? split(c, tAtY(c, 0))[1]
      : i === segments.length - 1
        ? split(c, tAtY(c, sceneHeight))[0]
        : c,
  );
  const halves = cut.map((c, i) => (i === 0 || i === cut.length - 1 ? null : split(c, 0.5)));
  const pieces = sides.map((_, i): [Cubic, Cubic] => [
    i === 0 ? (cut[0] as Cubic) : (halves[i]?.[1] as Cubic),
    i === n - 1 ? (cut[n] as Cubic) : (halves[i + 1]?.[0] as Cubic),
  ]);
  return { bends, pieces, path: pieces.flat() };
};

/**
 * The boxes of the things behind the first (#151): higher, slightly smaller,
 * keeping to an edge of the first's box; one that would come nearer the path
 * than `clearance` slides away from it.
 */
const behindBoxes = (
  points: readonly Point[],
  slot: Box,
  scale: number,
  side: Side,
  count: number,
  unit: number,
): (Box & { scale: number })[] => {
  const rows = VALLEY.behind.slice(0, Math.max(0, count - 1));
  const gap = VALLEY.clearance * unit;
  const outerEdge = side === 'right' ? slot.x + slot.width : slot.x;
  const boxAt = (k: number, rise: number) => {
    const width = BUILD.width * scale * k;
    const height = BUILD.height * scale * k;
    return { width, height, y: slot.y + slot.height - rise * scale - height };
  };
  const place = (k: number) =>
    rows.map(({ rise, edge }) => {
      const { width, height, y } = boxAt(k, rise);
      // the second at the outer edge, the third right beside it towards the
      // path: across the first's inner edge, above the lantern, if room allows
      const outer = edge === 'outer';
      const step = width + VALLEY.besideGap * scale;
      let x =
        side === 'right' ? outerEdge - width - (outer ? 0 : step) : outerEdge + (outer ? 0 : step);
      const reached = reach(points, y, y + height, gap, side);
      x = side === 'right' ? Math.max(x, reached) : Math.min(x, reached - width);
      return { x, y, width, height, scale: scale * k };
    });
  // Where the path comes nearer, both get smaller, so that they stand side
  // by side, neither covering the other: the largest size up to the rule's.
  const apart = (k: number) => {
    const [a, b] = place(k);
    if (!a || !b) return true;
    const gapScene = VALLEY.besideGap * scale - 1e-6;
    return side === 'right' ? b.x + b.width <= a.x - gapScene : a.x + a.width <= b.x - gapScene;
  };
  return place(largest(Math.min(...rows.map((r) => r.scale)), apart));
};

/** The ground patch a thing behind stands on: an ellipse under its base line, like the bay. */
const patchOf = (box: Box & { scale: number }): Ellipse => ({
  cx: box.x + box.width / 2,
  cy: box.y + (BUILD.base / BUILD.height) * box.height,
  rx: (VALLEY.patchWidth * box.width) / 2,
  ry: VALLEY.patchHalfHeight * box.scale,
});

/** Every box a place puts on the ground, for making room above the things behind. */
const groundOf = (p: ValleyPiece): Box[] => [p.plot, p.name, ...p.things.slice(1)];

const overlapsX = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width;

/** One pass of the layout, with `extra` room above each place and the scale at most `cap`. */
const compose = (
  sides: readonly Side[],
  counts: readonly number[],
  width: number,
  height: number,
  extra: readonly number[],
  cap?: number,
): ValleyLayout => {
  const unit = width / VALLEY.width;
  const n = sides.length;
  const pathWidth = VALLEY.pathWidth * unit;
  const pitch = height / Math.max(1, Math.min(n, VALLEY.fill));
  const added = extra.reduce((a, b) => a + b, 0);
  const sceneHeight = (n <= VALLEY.fill ? height : pitch * n) + added;
  if (n === 0) {
    const straight = curve({ x: width / 2, y: 0 }, { x: width / 2, y: sceneHeight });
    return { width, height: sceneHeight, unit, pathWidth, path: [straight], places: [] };
  }
  const scene = { width, height: sceneHeight, unit };
  const max = VALLEY.maxScale * unit;

  // A thing stands above its bay, so the bends move down until the slots
  // sit about in the middle of their pieces, by at most a quarter of the
  // spacing so the path still leaves at the bottom gently.
  const flat = pathFor(sides, width, unit, pitch, sceneHeight, 0, extra);
  const flatPoints = pathPoints(flat.path);
  const roomy = largest(max, (s) =>
    sides.every((side, i) => slotAt(flatPoints, flat.bends[i] as Point, side, s, scene, false)),
  );
  const shift = Math.min((BUILD.base - BUILD.height / 2 - VALLEY.baseDrop) * roomy, pitch / 4);
  const { bends, pieces, path } = pathFor(sides, width, unit, pitch, sceneHeight, shift, extra);
  const points = pathPoints(path);
  // one scale for every thing: the largest at which each slot fits
  const scale = largest(Math.min(max, cap ?? Infinity), (s) =>
    sides.every((side, i) => slotAt(points, bends[i] as Point, side, s, scene, true)),
  );

  const places = sides.map((side, i): ValleyPiece => {
    const bend = bends[i] as Point;
    const half = pieces[i] as [Cubic, Cubic];
    const none = { x: bend.x, y: bend.y, width: 0, height: 0 };
    const { slot, plot } = slotAt(points, bend, side, scale, scene, true) ?? {
      slot: none,
      plot: none,
    };
    const far = side === 'right' ? slot.x + slot.width : slot.x;
    const bay: Ellipse = {
      cx: (bend.x + far) / 2,
      cy: bend.y,
      rx: Math.abs(far - bend.x) / 2,
      ry: VALLEY.bayHalfHeight * scale,
    };
    const lineHeight = VALLEY.nameLine * unit;
    const nameHeight = 2 * lineHeight;
    const ny = bend.y - nameHeight / 2;
    const free = other(side);
    const near = reach(points, ny, ny + nameHeight, VALLEY.clearance * unit, free);
    const edge = VALLEY.edge * unit;
    const [nx0, nx1] = free === 'left' ? [edge, near] : [near, width - edge];
    const top = half[0].from;
    const bottom = half[1].to;
    const first = { ...slot, scale };
    const count = Math.min(Math.max(1, Math.round(counts[i] ?? 1)), VALLEY.things);
    const behind = behindBoxes(points, slot, scale, side, count, unit);
    return {
      side,
      piece: { x: 0, y: top.y, width, height: bottom.y - top.y },
      bend,
      joints: { top, bottom },
      path: half,
      slot: first,
      things: [first, ...behind],
      patches: behind.map(patchOf),
      plot,
      bay,
      doorstep: { x: slot.x + BUILD.door * scale, y: slot.y + BUILD.base * scale },
      name: {
        x: nx0,
        y: ny,
        width: Math.max(0, nx1 - nx0),
        height: nameHeight,
        // the name leans towards the path
        align: free === 'left' ? 'right' : 'left',
        lines: 2,
        size: VALLEY.nameSize * unit,
        lineHeight,
      },
    };
  });

  return { width, height: sceneHeight, unit, pathWidth, path, places };
};

/**
 * How much room each place needs above it so the things behind its first
 * stay in the scene and clear of every other place's ground: the scene
 * grows there, nothing shrinks (#151).
 */
const roomNeeded = (layout: ValleyLayout): number[] => {
  const gap = 2 * layout.unit;
  return layout.places.map((place, i) => {
    const behind = place.things.slice(1);
    if (behind.length === 0) return 0;
    const top = Math.min(...behind.map((b) => b.y));
    let need = -top;
    layout.places.forEach((other, j) => {
      if (j === i) return;
      for (const box of groundOf(other)) {
        if (box.y >= place.slot.y) continue;
        if (!behind.some((b) => overlapsX(b, box))) continue;
        need = Math.max(need, box.y + box.height + gap - top);
      }
    });
    return Math.max(0, need);
  });
};

/** The Valley's geometry for places on the given sides. */
export const valleyLayout = ({
  sides,
  things = [],
  width = VALLEY.width,
  height = VALLEY.height,
}: ValleyInput): ValleyLayout => {
  // The first things' size is the one without the things behind: a second
  // or third thing never makes them smaller; where it needs room above, the
  // scene grows by that much.
  const plain = compose(sides, [], width, height, []);
  if (!things.some((k) => k > 1)) return plain;
  const cap = plain.places[0]?.slot.scale;
  let extra = sides.map(() => 0);
  let layout = compose(sides, things, width, height, extra, cap);
  for (let round = 0; round < 6; round += 1) {
    const need = roomNeeded(layout);
    if (need.every((v) => v <= 0.01)) break;
    extra = extra.map((v, i) => v + (need[i] ?? 0));
    layout = compose(sides, things, width, height, extra, cap);
  }
  return layout;
};

/** SVG path data for a run of cubics (the centre line, to be stroked at `pathWidth`). */
export const cubicPathData = (path: readonly Cubic[], digits = 1): string => {
  const f = (v: number) => String(Number(v.toFixed(digits)));
  const [start] = path;
  if (!start) return '';
  return (
    `M${f(start.from.x)} ${f(start.from.y)}` +
    path
      .map((c) => `C${f(c.c1.x)} ${f(c.c1.y)} ${f(c.c2.x)} ${f(c.c2.y)} ${f(c.to.x)} ${f(c.to.y)}`)
      .join('')
  );
};
