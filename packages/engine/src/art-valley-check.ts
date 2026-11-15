import type { Problem } from './content-check';
import { pathPoints, VALLEY, type Box, type Point, type ValleyLayout } from './valley-layout';

/**
 * Checks on the Valley's layout (#127, docs/journey-design.md "The place
 * piece"), measured on what valleyLayout returned: nothing may cross the
 * path (owner, 2026-11-15), every plot (a slot with its room) and name
 * stays in the scene, every slot lies in its plot, the
 * bays stay on their thing's side, the doorstep lies on the bay, and no
 * two boxes overlap. The things behind the first (#151) stay in the
 * scene and clear of the path and of every other place, stand higher and
 * smaller than the one in front, and leave the doorstep, the lantern's room
 * and every thing's marker free; the name keeps two lines. `npm run
 * journeys` runs it for 1 to 12 places on both sides with 1 to 3 things.
 */

const EPS = 0.01;
/** A name box narrower than this many characters of its size cannot hold a short name. */
const NAME_MIN_CHARS = 5.5;

const inside = (b: Box, layout: ValleyLayout) =>
  b.x >= -EPS &&
  b.y >= -EPS &&
  b.x + b.width <= layout.width + EPS &&
  b.y + b.height <= layout.height + EPS;

/** The least distance from any point of the path to a box. */
const distance = (points: readonly Point[], b: Box) =>
  Math.min(
    ...points.map((p) => {
      const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.width));
      const dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.height));
      return Math.hypot(dx, dy);
    }),
  );

/** The centre line's x at a height (the path runs top to bottom, so y rises along it). */
const centreAt = (points: readonly Point[], y: number): number | null => {
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1] as Point, points[i] as Point];
    if (y >= a.y && y <= b.y)
      return b.y === a.y ? a.x : a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
  }
  return null;
};

const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.width - EPS &&
  b.x < a.x + a.width - EPS &&
  a.y < b.y + b.height - EPS &&
  b.y < a.y + a.height - EPS;

export const valleyProblems = (layout: ValleyLayout): Problem[] => {
  const problems: Problem[] = [];
  const error = (at: string, message: string) => problems.push({ level: 'error', at, message });
  const points = pathPoints(layout.path);
  const gap = VALLEY.clearance * layout.unit;
  const top = points[0];
  const end = points[points.length - 1];
  if (!top || !end || Math.abs(top.y) > EPS || Math.abs(end.y - layout.height) > EPS)
    error('path', 'comes in at the top edge and leaves at the bottom edge');

  const boxes: { at: string; box: Box; place: number; own?: boolean }[] = [];
  layout.places.forEach((place, i) => {
    const at = `place ${i + 1}`;
    const { slot, plot, name, bay, doorstep, side, things } = place;
    if (!(slot.scale > 0)) error(at, 'the slot has no room');
    // the plot holds the slot and the room beside it towards the path (the lantern)
    if (
      slot.x < plot.x - EPS ||
      slot.x + slot.width > plot.x + plot.width + EPS ||
      Math.abs(slot.y - plot.y) > EPS
    )
      error(`${at} slot`, 'lies outside its plot');
    for (const [what, box] of [
      ['plot', plot],
      ['name', name],
    ] as const) {
      if (!inside(box, layout)) error(`${at} ${what}`, 'leaves the scene');
      const d = distance(points, box);
      if (d < gap - EPS)
        error(`${at} ${what}`, `${d.toFixed(1)} from the path's centre line; at least ${gap}`);
      boxes.push({ at: `${at} ${what}`, box, place: i });
    }
    if (name.height < 2 * name.lineHeight - EPS) error(`${at} name`, 'holds fewer than two lines');
    if (things[0] !== slot) error(`${at} thing 1`, 'is not the slot');
    // the lantern's room: the plot beside the slot, towards the path
    const room: Box =
      side === 'right'
        ? { x: plot.x, y: plot.y, width: slot.x - plot.x, height: plot.height }
        : {
            x: slot.x + slot.width,
            y: plot.y,
            width: plot.x + plot.width - slot.x - slot.width,
            height: plot.height,
          };
    things.forEach((thing, k) => {
      const what = `${at} thing ${k + 1}`;
      // where the marker grows: the foot of the thing's box
      const band = VALLEY.markerBand * thing.scale;
      const marker: Box = { ...thing, y: thing.y + thing.height - band, height: band };
      if (!inside(marker, layout)) error(`${what} marker`, 'leaves the scene');
      for (const [hider, box] of [
        ['the lantern', room],
        ['the name', name],
      ] as const)
        if (overlap(marker, box)) error(`${what} marker`, `is hidden by ${hider}`);
      boxes.push({ at: `${what} marker`, box: marker, place: i, own: true });
      if (k === 0) return;
      const front = things[k - 1];
      if (!front) return;
      if (!inside(thing, layout)) error(what, 'leaves the scene');
      const d = distance(points, thing);
      if (d < gap - EPS)
        error(what, `${d.toFixed(1)} from the path's centre line; at least ${gap}`);
      if (!(thing.y + thing.height < front.y + front.height - EPS))
        error(what, 'does not stand behind the one in front');
      if (!(thing.scale < slot.scale)) error(what, 'is not smaller than the first');
      if (!overlap(thing, front)) error(what, 'stands apart, not behind the one in front');
      // the third shows at least half its width beside the second
      if (k >= 2) {
        const shared =
          Math.min(thing.x + thing.width, front.x + front.width) - Math.max(thing.x, front.x);
        if (shared > VALLEY.besideShare * thing.width + EPS)
          error(what, `hidden behind thing ${k}`);
      }
      if (
        doorstep.x >= thing.x &&
        doorstep.x <= thing.x + thing.width &&
        doorstep.y >= thing.y &&
        doorstep.y <= thing.y + thing.height
      )
        error(what, 'covers the doorstep');
      if (overlap(thing, room)) error(what, "covers the lantern's room");
      boxes.push({ at: what, box: thing, place: i, own: true });
    });
    if (name.width < NAME_MIN_CHARS * name.size)
      error(`${at} name`, `${name.width.toFixed(0)} wide; at least ${NAME_MIN_CHARS * name.size}`);
    // the bay: on the thing's side of the centre line, at every height
    const sign = side === 'right' ? 1 : -1;
    for (let k = 0; k < 96; k += 1) {
      const a = (2 * Math.PI * k) / 96;
      const p = { x: bay.cx + bay.rx * Math.cos(a), y: bay.cy + bay.ry * Math.sin(a) };
      const c = centreAt(points, p.y);
      if (c !== null && sign * (p.x - c) < -EPS) {
        error(`${at} bay`, `crosses the centre line at y = ${p.y.toFixed(1)}`);
        break;
      }
    }
    const far = side === 'right' ? slot.x + slot.width : slot.x;
    if (Math.abs(bay.cx + sign * bay.rx - far) > EPS)
      error(`${at} bay`, "reaches the slot's far side");
    const e = ((doorstep.x - bay.cx) / bay.rx) ** 2 + ((doorstep.y - bay.cy) / bay.ry) ** 2;
    if (!(e <= 1 + EPS)) error(`${at} doorstep`, 'lies on the bay');
  });
  for (let i = 0; i < boxes.length; i += 1)
    for (let j = i + 1; j < boxes.length; j += 1) {
      const [a, b] = [boxes[i], boxes[j]];
      // a place's own things stand behind each other on its plot
      if (!a || !b || (a.place === b.place && (a.own || b.own))) continue;
      if (overlap(a.box, b.box)) error(a.at, `overlaps ${b.at}`);
    }
  return problems;
};
