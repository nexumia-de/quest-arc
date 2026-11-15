import { describe, expect, it } from 'vitest';

import '../src/shared/languages';
import place from '../../../content/art/place.json';
import { placeLayers, type PlaceArt } from '../src/ui/valley-place';
import { placeSignWords } from '../src/ui/valley-place-words';

// The signs of a place (#131, docs/journey-design.md, "The signs of a
// place"): drawn from the view, nothing before it is earned.
const art = place as unknown as PlaceArt;
const slot = { x: 100, y: 50, scale: 2 };
const names = (layers: readonly { art: string }[]) => layers.map((l) => l.art);

describe('the layers of a place', () => {
  it('shows nothing on plain land or a thing without a sign', () => {
    expect(placeLayers(art, slot, { side: 'right' })).toEqual({ back: [], front: [] });
  });

  it('draws the flowers while a step is followed', () => {
    const { back, front } = placeLayers(art, slot, { side: 'right', sign: 'flowers' });
    expect(names(back)).toEqual([art.flowers]);
    expect(front).toEqual([]);
  });

  it('keeps the flowers and lights the lantern in front once it runs by itself', () => {
    const { back, front } = placeLayers(art, slot, { side: 'right', sign: 'lantern' });
    expect(names(back)).toEqual([art.flowers]);
    expect(names(front)).toEqual([art.lantern.art]);
    expect(front[0]).toMatchObject({
      x: slot.x + art.lantern.x * slot.scale,
      y: slot.y + art.lantern.y * slot.scale,
      width: art.lantern.width * slot.scale,
    });
  });

  it('lays the frame over the slot and mirrors it about the thing for a thing on the left', () => {
    const [x0, y0, w, h] = art.viewBox;
    const right = placeLayers(art, slot, { side: 'right', sign: 'flowers' }).back[0];
    expect(right).toMatchObject({
      x: slot.x + x0 * slot.scale,
      y: slot.y + y0 * slot.scale,
      width: w * slot.scale,
      height: h * slot.scale,
      mirror: false,
    });
    const left = placeLayers(art, slot, { side: 'left', sign: 'lantern' });
    expect(left.back[0]).toMatchObject({ x: slot.x + (120 - x0 - w) * slot.scale, mirror: true });
    // the lantern keeps its form and stands on the other side, towards the path
    expect(left.front[0]).toMatchObject({
      x: slot.x + (120 - art.lantern.x - art.lantern.width) * slot.scale,
      mirror: false,
    });
  });
});

describe('the words of a place', () => {
  it('names the sign, nothing that is still to come', () => {
    expect(placeSignWords({ side: 'right' })).toBe('');
    expect(placeSignWords({ side: 'right', sign: 'flowers' })).toBe('flowers grow at its foot');
    expect(placeSignWords({ side: 'left', sign: 'lantern' })).toBe(
      'flowers grow at its foot and its lantern is lit',
    );
  });
});
