import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain build script without types
import * as checks from '../../../scripts/ladder-checks.mjs';
import { valleyLayout } from '../src/valley-layout';

const { ladderGeometryProblems, placeProblems, RETIRING } = checks;

// The measured drawing rules (docs/journey-design.md, "Rules for drawing a
// ladder"), on the committed pictures: scripts/draw-ladders.mjs refuses to
// write a ladder that breaks them, and this catches a picture changed by
// other means. `npm run journeys` runs this file.
const dir = join(import.meta.dirname, '..', '..', '..', 'content', 'art');
const files = readdirSync(dir);
const pictures: Record<string, string> = Object.fromEntries(
  files
    .filter((f) => f.endsWith('.svg'))
    .map((f) => [f.slice(0, -4), readFileSync(join(dir, f), 'utf8')]),
);
const ladders = files
  .filter((f) => f.endsWith('.ladder.json'))
  .map((f) => f.slice(0, -'.ladder.json'.length))
  .filter((name) => !(RETIRING as Set<string>).has(name));

describe('the versions of each ladder, measured', () => {
  it.each(ladders)('%s: inside the box, growing, the threshold free', (name) => {
    const ladder: unknown = JSON.parse(readFileSync(join(dir, `${name}.ladder.json`), 'utf8'));
    expect(ladderGeometryProblems(name, ladder, pictures)).toEqual([]);
  });
});

// The place's signs and surroundings (#131, docs/journey-design.md, "Signs
// and surroundings of a place"): in the frame, never in front of the
// doorstep, the lantern clear of the threshold stone and every marker, and
// in the Valley inside the scene, off the path and clear of every other
// place, for every number of places and choice of sides.
describe('the place, measured', () => {
  it('fits every thing and every layout', { timeout: 60_000 }, () => {
    const place: unknown = JSON.parse(readFileSync(join(dir, 'place.json'), 'utf8'));
    const all = Object.fromEntries(
      files
        .filter((f) => f.endsWith('.ladder.json'))
        .map((f) => [
          f.slice(0, -'.ladder.json'.length),
          JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown,
        ]),
    );
    expect(placeProblems(place, pictures, all, valleyLayout)).toEqual([]);
  });
});
