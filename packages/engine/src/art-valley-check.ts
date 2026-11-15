import type { Problem } from './content-check';
import { pathPoints, VALLEY, type Box, type Point, type ValleyLayout } from './valley-layout';

/**
 * Checks on the Valley's layout (#127, docs/journey-design.md "The place
 * piece"), measured on what valleyLayout returned: nothing may cross the
 * path (owner, 2026-11-15), every slot and name stays in the scene, the
 * bays stay on their thing's side, the doorstep lies on the bay, and no
 * two boxes overlap. `npm run journeys` runs it for 1 to 12 places on
 * both sides.
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

  const boxes: { at: string; box: Box }[] = [];
  layout.places.forEach((place, i) => {
    const at = `place ${i + 1}`;
    const { slot, name, bay, doorstep, side } = place;
    if (!(slot.scale > 0)) error(at, 'the slot has no room');
    for (const [what, box] of [
      ['slot', slot],
      ['name', name],
    ] as const) {
      if (!inside(box, layout)) error(`${at} ${what}`, 'leaves the scene');
      const d = distance(points, box);
      if (d < gap - EPS)
        error(`${at} ${what}`, `${d.toFixed(1)} from the path's centre line; at least ${gap}`);
      boxes.push({ at: `${at} ${what}`, box });
    }
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
      if (a && b && overlap(a.box, b.box)) error(a.at, `overlaps ${b.at}`);
    }
  return problems;
};
