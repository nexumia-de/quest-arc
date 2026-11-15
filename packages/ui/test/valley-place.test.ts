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

describe('the layers of a place', () => {
  it('shows nothing on plain land or a thing without a sign', () => {
    expect(placeLayers(art, slot, { side: 'right', surroundings: 0 })).toEqual({
      back: [],
      front: [],
    });
  });

  it('draws the plants behind the thing while a step is followed', () => {
    const { back, front } = placeLayers(art, slot, {
      side: 'right',
      sign: 'plants',
      surroundings: 0,
    });
    expect(names(back)).toEqual([art.plants]);
    expect(front).toEqual([]);
  });

  it('keeps the plants and lights the lantern in front once it runs by itself', () => {
    const { back, front } = placeLayers(art, slot, {
      side: 'right',
      sign: 'lantern',
      surroundings: 0,
    });
    expect(names(back)).toEqual([art.plants]);
    expect(names(front)).toEqual([art.lantern.art]);
    expect(front[0]).toMatchObject({
      x: slot.x + art.lantern.x * slot.scale,
      y: slot.y + art.lantern.y * slot.scale,
      width: art.lantern.width * slot.scale,
    });
  });

  it('adds the surroundings step by step, each over the ones before, behind the plants', () => {
    expect(art.surroundings).toHaveLength(SURROUNDINGS_STEPS);
    for (let steps = 1; steps <= SURROUNDINGS_STEPS; steps++) {
      const { back } = placeLayers(art, slot, {
        side: 'right',
        sign: 'plants',
        surroundings: steps,
      });
      expect(names(back)).toEqual([
        ...art.surroundings.slice(0, steps).map((s) => s.art),
        art.plants,
      ]);
    }
    const more = placeLayers(art, slot, { side: 'right', surroundings: 9 });
    expect(more.back).toHaveLength(SURROUNDINGS_STEPS);
  });

  it('lays the frame over the slot and mirrors it for a thing on the left', () => {
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
    expect(left.back[0]?.mirror).toBe(true);
    // the lantern keeps its form and stands on the other side of the doorstep
    expect(left.front[0]).toMatchObject({
      x: slot.x + (120 - art.lantern.x - art.lantern.width) * slot.scale,
      mirror: false,
    });
  });
});

describe('the words of a place', () => {
  it('names sign and surroundings, nothing that is still to come', () => {
    expect(placeSignWords(art, { side: 'right', surroundings: 0 })).toBe('');
    expect(placeSignWords(art, { side: 'right', sign: 'plants', surroundings: 0 })).toBe(
      'plants grow around it',
    );
    expect(placeSignWords(art, { side: 'left', sign: 'lantern', surroundings: 2 })).toBe(
      'plants grow around it and its lantern is lit; around it: a low fence and a tree',
    );
    expect(placeSignWords(art, { side: 'left', surroundings: 4 })).toBe(
      'around it: a low fence, a tree, a bench and a gate',
    );
  });
});
