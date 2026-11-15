import { LADDERS } from '@questarc/engine';
import { describe, expect, it } from 'vitest';

import garden from '../../../content/art/garden.ladder.json';
import home from '../../../content/art/home.ladder.json';
import lookout from '../../../content/art/lookout.ladder.json';
import well from '../../../content/art/well.ladder.json';
import palette from '../../../content/art/palette.json';
import place from '../../../content/art/place.json';
// @ts-expect-error: a plain build script without types
import { ladderArt } from '../art.mjs';

// The journey screen with the build (#100): what the plugin bundles, and that
// the engine's list and the pictures name the same things. Every named picture exists: the ladder checker
// (npm run journeys) requires it.
const ladders: Record<
  string,
  { versions: { art: string }[]; pictures: { slot?: string; art?: string }[] }
> = {
  garden,
  home,
  lookout,
  well,
};

describe('the plugin bundles only the pictures of the build', () => {
  const kept: Set<string> = ladderArt({ ladders, place });

  it('keeps every picture a ladder scene, the row or the chooser draws', () => {
    for (const ladder of Object.values(ladders))
      for (const v of ladder.versions) expect(kept).toContain(v.art);
    // the flowers, in bud and open (#152)
    for (const ladder of Object.values(ladders))
      for (const p of ladder.pictures.filter((place) => place.slot === 'marker')) {
        expect(kept).toContain(p.art);
        expect(kept).toContain(`${p.art}-open`);
      }
    expect(kept).toContain('lantern');
  });

  it('keeps the lantern of a place for each side of the path (#131)', () => {
    expect(kept).toContain(place.lantern.left);
    expect(kept).toContain(place.lantern.right);
  });

  it('leaves out pictures the journey screen does not draw', () => {
    expect(kept).not.toContain('keepsake-first-step');
  });
});

describe('the engine offers only ladders the plugin draws', () => {
  it('every ladder and hue of the engine is in the bundled pictures', () => {
    for (const name of Object.keys(LADDERS.ladders)) expect(Object.keys(ladders)).toContain(name);
    expect(Object.keys(palette).sort()).toEqual([...LADDERS.hues].sort());
  });
});
