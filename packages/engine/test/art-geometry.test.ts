import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain build script without types
import { ladderGeometryProblems, RETIRING } from '../../../scripts/ladder-checks.mjs';

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
