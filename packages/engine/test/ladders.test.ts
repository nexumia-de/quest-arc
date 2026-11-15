import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Journey } from '../src/types/journey';
import { LADDERS, markerFits, resolveBuild } from '../src/ladders';
import { withWaterLadder } from './water-ladder';

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

  it('has a default ladder, and every default marker and hue fits', () => {
    expect(LADDERS.ladders[LADDERS.defaultLadder]).toBeDefined();
    for (const [name, ladder] of Object.entries(LADDERS.ladders)) {
      expect(markerFits(ladder.marker, name), name).toBe(true);
      expect(LADDERS.hues, name).toContain(ladder.hue);
    }
  });

  it('keeps flowers off water', () => {
    // every ladder of the Valley is land (#128); the rule stays for one on water
    for (const ladder of Object.values(LADDERS.ladders)) expect(ladder.water).toBe(false);
    withWaterLadder(() => {
      expect(markerFits('flowers', 'pond')).toBe(false);
      expect(markerFits('lanterns', 'pond')).toBe(true);
      const journey = { build: { ladder: 'pond' } } as unknown as Journey;
      expect(resolveBuild(journey, { marker: 'flowers' })).toEqual({
        ladder: 'pond',
        marker: 'lanterns',
        hue: 'water',
      });
    });
    expect(markerFits('flowers', 'home')).toBe(true);
    expect(markerFits('balloons', 'home')).toBe(false);
  });
});
