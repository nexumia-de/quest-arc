import { SURROUNDINGS_STEPS } from '@questarc/engine';
import { describe, expect, it } from 'vitest';

import '../src/shared/languages';
import place from '../../../content/art/place.json';
import { placeLayers, type PlaceArt } from '../src/ui/valley-place';
import { placeSignWords } from '../src/ui/valley-place-words';

// A place's signs and surroundings (#131, docs/journey-design.md, "Signs and
// surroundings of a place"): drawn from the view, nothing before it is earned.
const art = place as unknown as PlaceArt;
const slot = { x: 100, y: 50, scale: 2 };
const names = (layers: readonly { art: string }[]) => layers.map((l) => l.art);
const byStep = (n: number) => art.surroundings.slice(0, n);

describe('the layers of a place', () => {
  it('shows nothing on plain land or a thing without a sign', () => {
    expect(placeLayers(art, slot, { side: 'right', surroundings: 0 })).toEqual({
      back: [],
      front: [],
    });
  });

  it('draws the flowers while a step is followed', () => {
    const { back, front } = placeLayers(art, slot, {
      side: 'right',
      sign: 'flowers',
      surroundings: 0,
    });
    expect(names(back)).toEqual([art.flowers]);
    expect(front).toEqual([]);
  });

  it('keeps the flowers and lights the lantern in front once it runs by itself', () => {
    const { back, front } = placeLayers(art, slot, {
      side: 'right',
      sign: 'lantern',
      surroundings: 0,
    });
    expect(names(back)).toEqual([art.flowers]);
    expect(names(front)).toEqual([art.lantern.art]);
    expect(front[0]).toMatchObject({
      x: slot.x + art.lantern.x * slot.scale,
      y: slot.y + art.lantern.y * slot.scale,
      width: art.lantern.width * slot.scale,
    });
  });

  it('names the steps hedge, bench, tree, butterfly, as many as the engine counts', () => {
    expect(art.surroundings.map((s) => s.art)).toEqual([
      'place-hedge',
      'place-bench',
      'place-tree',
      'place-butterfly',
    ]);
    expect(art.surroundings).toHaveLength(SURROUNDINGS_STEPS);
  });

  it('adds the steps as they are earned, drawn back to front, behind the flowers', () => {
    for (let steps = 1; steps <= SURROUNDINGS_STEPS; steps++) {
      const { back } = placeLayers(art, slot, {
        side: 'right',
        sign: 'flowers',
        surroundings: steps,
      });
      const drawn = [...byStep(steps)].sort((a, b) => a.z - b.z).map((s) => s.art);
      expect(names(back)).toEqual([...drawn, art.flowers]);
    }
    // the tree, earned third, stands behind the hedge and the bench
    expect(names(placeLayers(art, slot, { side: 'right', surroundings: 3 }).back)).toEqual([
      'place-tree',
      'place-hedge',
      'place-bench',
    ]);
    expect(placeLayers(art, slot, { side: 'right', surroundings: 9 }).back).toHaveLength(
      SURROUNDINGS_STEPS,
    );
  });

  it('lays the frame over the slot and mirrors it about the thing for a thing on the left', () => {
    const [x0, y0, w, h] = art.viewBox;
    const right = placeLayers(art, slot, { side: 'right', surroundings: 1 }).back[0];
    expect(right).toMatchObject({
      x: slot.x + x0 * slot.scale,
      y: slot.y + y0 * slot.scale,
      width: w * slot.scale,
      height: h * slot.scale,
      mirror: false,
    });
    const left = placeLayers(art, slot, { side: 'left', sign: 'lantern', surroundings: 1 });
    expect(left.back[0]).toMatchObject({ x: slot.x + (120 - x0 - w) * slot.scale, mirror: true });
    // the lantern keeps its form and stands on the other side, towards the path
    expect(left.front[0]).toMatchObject({
      x: slot.x + (120 - art.lantern.x - art.lantern.width) * slot.scale,
      mirror: false,
    });
  });
});

describe('the words of a place', () => {
  it('names sign and surroundings, nothing that is still to come', () => {
    expect(placeSignWords(art, { side: 'right', surroundings: 0 })).toBe('');
    expect(placeSignWords(art, { side: 'right', sign: 'flowers', surroundings: 0 })).toBe(
      'flowers grow at its foot',
    );
    expect(placeSignWords(art, { side: 'left', sign: 'lantern', surroundings: 2 })).toBe(
      'flowers grow at its foot and its lantern is lit; beside it: a low hedge and a bench',
    );
    expect(placeSignWords(art, { side: 'left', surroundings: 4 })).toBe(
      'beside it: a low hedge, a bench, a tree and a butterfly',
    );
  });
});
