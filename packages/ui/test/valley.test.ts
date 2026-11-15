import { valleyLayout, valleyProblems } from '@questarc/engine';
import type { AnchorView, Journey, ValleyPlace } from '@questarc/engine';
import { describe, expect, it } from 'vitest';

import garden from '../../../content/art/garden.ladder.json';
import home from '../../../content/art/home.ladder.json';
import '../src/shared/languages';
import type { Ladder } from '../src/ui/ladder';
import { grownSince, MIN_SCENE_HEIGHT, sceneHeight, valleyModel } from '../src/ui/valley/model';

// The Valley as the home (#129): what is drawn and said per place, from the
// engine's valley view and its layout. The DOM is walked in the real-app test.
const pack = { ladders: { home, garden } as unknown as Record<string, Ladder> };

const place = (id: string, over: Partial<ValleyPlace> = {}): ValleyPlace => ({
  anchorId: id,
  name: id,
  side: 'right',
  hue: 'meadow',
  things: [],
  unbuilt: [],
  growing: false,
  chosen: {},
  ...over,
});
const thing = (version: number, ladder = 'home') =>
  ({
    runId: `run-${ladder}`,
    journeyId: 'j',
    state: 'growing',
    ladder,
    version,
    versions: 5,
    skipped: [],
    marker: 'lanterns',
    markerProgress: 0,
    ready: false,
  }) as unknown as ValleyPlace['things'][number];
const anchor = (id: string, words: string): AnchorView =>
  ({
    id,
    kind: 'routine',
    words,
    state: 'resting',
    growing: false,
    steps: [],
    resting: [],
  }) as unknown as AnchorView;
const journeys = [] as readonly Journey[];

describe('the Valley model', () => {
  const places = [
    place('a', { growing: true, things: [thing(3)], sign: 'plants' }),
    place('b', { side: 'left', things: [thing(2, 'garden')], sign: 'lantern' }),
    place('c'),
  ];
  const anchors = [anchor('a', 'getting up'), anchor('b', 'lunch'), anchor('c', 'dinner')];
  const model = valleyModel(places, anchors, journeys, pack);

  it('takes every number from the engine layout, in the order of the day', () => {
    expect(model.places).toHaveLength(3);
    expect(model.geometry.places.map((p) => p.side)).toEqual(['right', 'left', 'right']);
    model.places.forEach((p, i) => expect(p.piece).toBe(model.geometry.places[i]));
  });

  it('names a place as the moment is named: the user\'s words in "After …"', () => {
    expect(model.places.map((p) => p.title)).toEqual([
      'After getting up',
      'After lunch',
      'After dinner',
    ]);
  });

  it('draws the current version of the thing, and nothing on plain land', () => {
    expect(model.places[0]?.art).toBe(home.versions[2]?.art);
    expect(model.places[1]?.art).toBe(garden.versions[1]?.art);
    expect(model.places[2]?.art).toBeUndefined();
  });

  it('says every place in words: name, thing, version, growing and sign', () => {
    const [a, b, c] = model.places.map((p) => p.label);
    expect(a).toContain('After getting up');
    expect(a).toContain('version 3 of 5');
    expect(a).toContain('Growing here.');
    expect(a).toContain('Plants grow here');
    expect(b).toContain('version 2 of 5');
    expect(b).toContain('The lantern is lit');
    expect(b).not.toContain('Growing here.');
    expect(c).toBe('After dinner: nothing stands here yet.');
  });

  it('gives every place a tap area of at least 44 × 44 inside the scene, edge to edge', () => {
    for (const { hit } of model.places) {
      expect(hit.height).toBeGreaterThanOrEqual(44);
      expect(hit.width).toBe(model.geometry.width);
      expect(hit.y).toBeGreaterThanOrEqual(0);
      expect(hit.y + hit.height).toBeLessThanOrEqual(model.geometry.height);
    }
  });

  it('tap areas of neighbours do not overlap, up to six places and beyond', () => {
    for (const n of [1, 3, 6, 9]) {
      const many = Array.from({ length: n }, (_, i) =>
        place(`p${i}`, { side: i % 2 === 0 ? 'right' : 'left', things: [thing(1)] }),
      );
      const m = valleyModel(many, [], journeys, pack);
      for (let i = 1; i < m.places.length; i += 1) {
        const above = m.places[i - 1]?.hit;
        const below = m.places[i]?.hit;
        expect((above?.y ?? 0) + (above?.height ?? 0)).toBeLessThanOrEqual(below?.y ?? 0);
      }
    }
  });

  it('fills 360 × 720 with six places and scrolls beyond; plain land is short', () => {
    const size = (n: number) => {
      const g = valleyModel(
        Array.from({ length: n }, (_, i) => place(`p${i}`, { side: i % 2 ? 'left' : 'right' })),
        [],
        journeys,
        pack,
      ).geometry;
      return [g.width, g.height];
    };
    expect(size(1)).toEqual([360, 720]);
    expect(size(6)).toEqual([360, 720]);
    expect(size(8)?.[1]).toBeGreaterThan(720);
    expect(size(0)?.[1]).toBeLessThan(720);
  });

  it('draws no thing where its ladder is not in the pack', () => {
    const bare = valleyModel([place('a', { things: [thing(1)] })], [], journeys, { ladders: {} });
    expect(bare.places[0]?.art).toBeUndefined();
    expect(bare.places[0]?.label).toBe('a: nothing stands here yet.');
  });
});

describe('a new version appears, the first draw animates nothing', () => {
  const at = (version: number) =>
    valleyValue([
      place('a', { things: [thing(version)] }),
      place('b', { things: [thing(2, 'garden')] }),
    ]);
  const valleyValue = (places: ValleyPlace[]) => valleyModel(places, [], journeys, pack);

  it('marks only the thing whose version grew', () => {
    const first = grownSince(undefined, at(2));
    expect(first.grown.size).toBe(0);
    const same = grownSince(first.versions, at(2));
    expect(same.grown.size).toBe(0);
    const next = grownSince(same.versions, at(3));
    expect([...next.grown]).toEqual(['a']);
  });

  it('does not animate a version that went down or a thing that is new', () => {
    const before = grownSince(undefined, at(3)).versions;
    expect(grownSince(before, at(2)).grown.size).toBe(0);
    expect(grownSince(new Map(), at(2)).grown.size).toBe(0);
  });
});

describe('the place piece draws the first thing, or the one of the journey whose page it is (#130)', () => {
  const two = [place('a', { things: [thing(3), { ...thing(1), runId: 'second' }] })];
  it('draws the first thing, and the one of a given run', () => {
    expect(valleyModel(two, [], journeys, pack).places[0]?.thing?.runId).toBe('run-home');
    const own = valleyModel(two, [], journeys, pack, { runId: 'second' }).places[0];
    expect(own?.thing?.runId).toBe('second');
    expect(own?.art).toBe(home.versions[0]?.art);
  });

  it('draws the first thing for a run that builds none', () => {
    const model = valleyModel(two, [], journeys, pack, { runId: 'unbuilt' });
    expect(model.places[0]?.thing?.runId).toBe('run-home');
  });
});

describe('the place piece drawn large (#130)', () => {
  const growing = (progress: number, ready = false) =>
    valleyModel(
      [place('a', { growing: true, things: [{ ...thing(2), markerProgress: progress, ready }] })],
      [],
      journeys,
      pack,
      { height: 300, own: true, marker: true },
    ).places[0];

  it('is as high as asked, one place filling it', () => {
    const model = valleyModel([place('a')], [], journeys, pack, { height: 300, own: true });
    expect(model.geometry.height).toBe(300);
  });

  it('draws the marker only where asked and only while its journey grows', () => {
    const plain = valleyModel([place('a', { things: [thing(2)] })], [], journeys, pack);
    expect(plain.places[0]?.marker).toBeUndefined();
    const resting = valleyModel(
      [place('a', { things: [{ ...thing(2), state: 'finished' }] })],
      [],
      journeys,
      pack,
      { marker: true },
    );
    expect(resting.places[0]?.marker).toBeUndefined();
    expect(growing(0.5)?.marker?.length).toBeGreaterThan(0);
  });

  it('stands the marker in front of the thing, inside its slot and never across the path', () => {
    const piece = growing(1, true);
    const slot = piece?.piece.slot;
    expect(slot).toBeDefined();
    for (const m of piece?.marker ?? []) {
      if (m.art.includes('cord')) continue;
      expect(m.x).toBeGreaterThanOrEqual((slot?.x ?? 0) - 0.01);
      expect(m.x + m.width).toBeLessThanOrEqual((slot?.x ?? 0) + (slot?.width ?? 0) + 0.01);
      expect(m.y + m.height).toBeLessThanOrEqual((slot?.y ?? 0) + (slot?.height ?? 0) + 0.01);
    }
  });

  it('shows more elements as the stage progresses and none beyond its order', () => {
    const few = growing(0.2)?.marker ?? [];
    const all = growing(1)?.marker ?? [];
    expect(all.length).toBeGreaterThan(few.length);
    expect(Math.max(...few.map((m) => m.order))).toBeLessThan(Math.max(...all.map((m) => m.order)));
  });

  it('passes the layout checks alone at the place page height, from either side', () => {
    for (const side of ['left', 'right'] as const)
      expect(valleyProblems(valleyLayout({ sides: [side], height: 230 }))).toEqual([]);
  });
});

describe('the scene is about two thirds of the window high', () => {
  it('is 480 units on a 360 × 720 phone, so the growing card starts on the first screen', () => {
    expect(sceneHeight(720, 360)).toBe(480);
    expect(sceneHeight(900, 360)).toBe(600);
  });

  it("is scaled to the scene's width, and never below the checked minimum", () => {
    expect(sceneHeight(700, 440)).toBe(MIN_SCENE_HEIGHT);
    expect(sceneHeight(300, 360)).toBe(MIN_SCENE_HEIGHT);
  });

  it('passes the layout checks at the minimum for one to twelve places', () => {
    for (let n = 1; n <= 12; n += 1) {
      const sides = Array.from(
        { length: n },
        (_, i) => (i % 2 === 0 ? 'right' : 'left') as 'right' | 'left',
      );
      expect(valleyProblems(valleyLayout({ sides, height: MIN_SCENE_HEIGHT }))).toEqual([]);
    }
  });

  it('is the height of the layout, longer beyond six places', () => {
    const six = Array.from({ length: 6 }, (_, i) =>
      place(`p${i}`, { side: i % 2 ? 'left' : 'right' }),
    );
    const eight = [...six, place('p6'), place('p7', { side: 'left' })];
    expect(valleyModel(six, [], journeys, pack, { height: 480 }).geometry.height).toBe(480);
    expect(valleyModel(eight, [], journeys, pack, { height: 480 }).geometry.height).toBe(640);
    expect(valleyModel(six, [], journeys, pack, { height: 300 }).geometry.height).toBe(480);
  });
});
