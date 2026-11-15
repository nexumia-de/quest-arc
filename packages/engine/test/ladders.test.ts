import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Journey } from '../src/types/journey';
import { LADDERS, resolveBuild } from '../src/ladders';

// The engine's list of ladders comes from content/art/ (docs/game-rules.md
// §9); the art checker checks the files themselves.
const art = join(import.meta.dirname, '..', '..', '..', 'content', 'art');

describe('the list of ladders', () => {
  it('has every ladder file in content/art', () => {
    const files = readdirSync(art)
      .filter((file) => file.endsWith('.ladder.json'))
      .map((file) => file.slice(0, -'.ladder.json'.length));
    expect(Object.keys(LADDERS.ladders).sort()).toEqual(files.sort());
  });

  it('has a default ladder, and every default hue is in the palette', () => {
    expect(LADDERS.ladders[LADDERS.defaultLadder]).toBeDefined();
    for (const [name, ladder] of Object.entries(LADDERS.ladders))
      expect(LADDERS.hues, name).toContain(ladder.hue);
  });

  it('resolves no marker: it is always flowers, an older choice is ignored (#152)', () => {
    const journey = { build: { ladder: 'well' } } as unknown as Journey;
    const older = { marker: 'lanterns' } as Parameters<typeof resolveBuild>[1];
    expect(resolveBuild(journey, older)).toEqual({ ladder: 'well', hue: 'water' });
  });
});
