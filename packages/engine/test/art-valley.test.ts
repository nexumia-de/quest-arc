import { describe, expect, it } from 'vitest';
import { valleyProblems } from '../src/art-valley-check';
import { pathPoints, VALLEY, valleyLayout, type Side } from '../src/valley-layout';

// The Valley's place pieces (#127, docs/journey-design.md "The place
// piece"): laid out by rule and measured. `npm run journeys` runs this file.
const alternating = (n: number, first: Side): Side[] =>
  Array.from({ length: n }, (_, i) => ((i % 2 === 0) === (first === 'right') ? 'right' : 'left'));
const every = (n: number): Side[][] =>
  Array.from({ length: 2 ** n }, (_, m) =>
    Array.from({ length: n }, (_, i): Side => ((m >> i) & 1 ? 'left' : 'right')),
  );
const messages = (sides: Side[], width?: number, height?: number, things?: number[]) =>
  valleyProblems(valleyLayout({ sides, width, height, things })).map(
    (p) => `${p.at}: ${p.message}`,
  );
/** Things at each place: all k, or 1, 2, 3 in turn starting at `from`. */
const counts = (n: number, k: number | 'mixed', from = 0): number[] =>
  Array.from({ length: n }, (_, i) => (k === 'mixed' ? ((i + from) % 3) + 1 : k));

describe('the place pieces, measured', () => {
  const counts = Array.from({ length: 12 }, (_, i) => i + 1);
  it.each(counts)(
    '%i places, things alternating from either side: nothing crosses the path',
    (n) => {
      expect(messages(alternating(n, 'right'))).toEqual([]);
      expect(messages(alternating(n, 'left'))).toEqual([]);
    },
  );

  it('holds for every choice of sides up to six places', () => {
    for (let n = 1; n <= 6; n += 1)
      for (const sides of every(n)) expect(messages(sides), sides.join(' ')).toEqual([]);
  });

  it('holds drawn larger, at 720 wide', () => {
    expect(messages(alternating(6, 'right'), 720, 1440)).toEqual([]);
  });
});

// #151: up to three things at a place, the second and third behind the first.
describe('the things behind the first, measured', () => {
  const places = Array.from({ length: 12 }, (_, i) => i + 1);
  const kinds = [1, 2, 3, 'mixed'] as const;
  // the Valley's own heights: the layout's, the home's least (480) and one place's page (230)
  it.each(places)('%i places, both sides, 1 to 3 things each: nothing hides or crosses', (n) => {
    for (const first of ['right', 'left'] as const)
      for (const k of kinds)
        for (const from of [0, 1, 2])
          for (const height of [720, 480]) {
            const sides = alternating(n, first);
            expect(
              messages(sides, 360, height, counts(n, k, from)),
              `${first} ${k} ${height}`,
            ).toEqual([]);
          }
  });

  it('holds for every choice of sides up to six places, with three things at each', () => {
    for (let n = 1; n <= 6; n += 1)
      for (const sides of every(n)) {
        expect(messages(sides, 360, 720, counts(n, 3)), sides.join(' ')).toEqual([]);
        expect(messages(sides, 360, 480, counts(n, 'mixed')), sides.join(' ')).toEqual([]);
      }
  });

  it('holds for one place drawn as its own page, and at 720 wide', () => {
    for (const side of ['right', 'left'] as const)
      for (const k of [1, 2, 3]) expect(messages([side], 360, 230, [k])).toEqual([]);
    expect(messages(alternating(6, 'right'), 720, 1440, counts(6, 3))).toEqual([]);
  });
});

describe('valleyLayout with things behind the first', () => {
  it('keeps the first where it stood and as large, wherever there is room above', () => {
    for (const n of [1, 3]) {
      const sides = alternating(n, 'right');
      const one = valleyLayout({ sides });
      const three = valleyLayout({ sides, things: counts(n, 3) });
      expect(three.height).toBe(one.height);
      three.places.forEach((p, i) => expect(p.slot).toEqual(one.places[i]?.slot));
    }
  });

  it('never makes a first thing smaller; the scene grows where the band above is full', () => {
    const sides = alternating(6, 'right');
    const one = valleyLayout({ sides, height: 480 });
    const stacked = valleyLayout({ sides, height: 480, things: counts(6, 3) });
    expect(stacked.places[0]?.slot.scale).toBeCloseTo(one.places[0]?.slot.scale ?? 0, 9);
    expect(stacked.height).toBeGreaterThan(one.height);
  });

  it('stands the second and third higher, smaller, the second on the side away from the path', () => {
    for (const side of ['right', 'left'] as const) {
      const [place] = valleyLayout({ sides: [side], things: [3] }).places;
      if (!place) throw new Error('one place');
      const [first, second, third] = place.things;
      if (!first || !second || !third) throw new Error('three things');
      expect(first).toEqual(place.slot);
      expect(second.y + second.height).toBeLessThan(first.y + first.height);
      expect(third.y + third.height).toBeLessThan(second.y + second.height);
      expect(second.scale).toBeCloseTo(first.scale * VALLEY.behind[0].scale, 9);
      const outer = (b: typeof first) => (side === 'right' ? b.x + b.width : b.x);
      expect(outer(second)).toBeCloseTo(outer(first), 9);
    }
  });

  it('holds at most three things, one where none is given', () => {
    const [place] = valleyLayout({ sides: ['right'], things: [5] }).places;
    expect(place?.things).toHaveLength(3);
    const [plain] = valleyLayout({ sides: ['left'] }).places;
    expect(plain?.things).toHaveLength(1);
  });
});

describe('valleyLayout', () => {
  it('fills 360 × 720 with up to six places and grows longer with more', () => {
    expect(valleyLayout({ sides: alternating(1, 'right') }).height).toBe(720);
    expect(valleyLayout({ sides: alternating(6, 'right') }).height).toBe(720);
    expect(valleyLayout({ sides: alternating(12, 'right') }).height).toBe(1440);
  });

  it('bends 20 + 6 n to the side away from the thing, at most 56', () => {
    const offset = (n: number) => {
      const [place] = valleyLayout({ sides: alternating(n, 'right') }).places;
      return 180 - (place?.bend.x ?? 0);
    };
    expect(offset(1)).toBeCloseTo(26, 6);
    expect(offset(3)).toBeCloseTo(38, 6);
    expect(offset(6)).toBeCloseTo(56, 6);
    expect(offset(9)).toBeCloseTo(56, 6);
    const [left] = valleyLayout({ sides: ['left'] }).places;
    expect(left?.bend.x).toBeCloseTo(206, 6);
  });

  it('spaces the places evenly and runs the path from the top edge to the bottom edge', () => {
    const layout = valleyLayout({ sides: alternating(6, 'right') });
    const ys = layout.places.map((p) => p.bend.y);
    for (let i = 1; i < ys.length; i += 1)
      expect((ys[i] ?? 0) - (ys[i - 1] ?? 0)).toBeCloseTo(120, 6);
    const points = pathPoints(layout.path);
    expect(points[0]?.y).toBeCloseTo(0, 6);
    expect(points[points.length - 1]?.y).toBeCloseTo(720, 6);
    expect(layout.pathWidth).toBe(VALLEY.pathWidth);
  });

  it('joins the pieces: a piece ends where the next begins', () => {
    const { places } = valleyLayout({ sides: alternating(5, 'left') });
    for (let i = 1; i < places.length; i += 1) {
      expect(places[i]?.joints.top).toEqual(places[i - 1]?.joints.bottom);
      expect(places[i]?.path[0].from).toEqual(places[i]?.joints.top);
      expect(places[i]?.piece.y).toBeCloseTo(places[i]?.joints.top.y ?? NaN, 9);
    }
  });

  it('keeps room beside every slot towards the path, for the lantern', () => {
    for (const place of valleyLayout({ sides: ['right', 'left', 'left'] }).places) {
      const { slot, plot, side } = place;
      const s = slot.scale;
      expect(plot.width).toBeCloseTo((VALLEY.plotNear + 120) * s, 9);
      expect(plot.y).toBeCloseTo(slot.y, 9);
      const near = side === 'right' ? slot.x - plot.x : plot.x + plot.width - slot.x - slot.width;
      expect(near).toBeCloseTo(VALLEY.plotNear * s, 9);
    }
  });

  it('draws things large with few places and one size for all', () => {
    const scale = (n: number) =>
      valleyLayout({ sides: alternating(n, 'right') }).places[0]?.slot.scale ?? 0;
    expect(scale(1)).toBeGreaterThan(scale(3));
    expect(scale(3)).toBeGreaterThan(scale(6));
    // with the room beside every slot (#131) six places draw a thing at 0.85
    expect(scale(6)).toBeGreaterThan(0.8);
    expect(scale(12)).toBeCloseTo(scale(6), 9);
    const scales = valleyLayout({ sides: alternating(6, 'right') }).places.map((p) => p.slot.scale);
    expect(new Set(scales).size).toBe(1);
  });

  it('puts the slot on the thing’s side, the name on the free side, the doorstep on the bay', () => {
    for (const place of valleyLayout({ sides: alternating(4, 'right') }).places) {
      const right = place.side === 'right';
      expect(
        right ? place.slot.x > place.bend.x : place.slot.x + place.slot.width < place.bend.x,
      ).toBe(true);
      expect(
        right ? place.name.x + place.name.width < place.bend.x : place.name.x > place.bend.x,
      ).toBe(true);
      expect(place.name.align).toBe(right ? 'right' : 'left');
      expect(place.name.lines).toBe(2);
      expect(place.doorstep.x).toBeCloseTo(place.slot.x + 60 * place.slot.scale, 9);
      expect(place.bay.cy).toBe(place.bend.y);
    }
  });

  it('draws the same scene larger at 720 wide, not rearranged', () => {
    const small = valleyLayout({ sides: alternating(3, 'left') });
    const large = valleyLayout({ sides: alternating(3, 'left'), width: 720, height: 1440 });
    expect(large.height).toBe(2 * small.height);
    small.places.forEach((p, i) => {
      const q = large.places[i];
      expect(q?.bend.x).toBeCloseTo(2 * p.bend.x, 6);
      expect(q?.bend.y).toBeCloseTo(2 * p.bend.y, 6);
      expect(q?.slot.scale).toBeCloseTo(2 * p.slot.scale, 6);
      expect(q?.name.size).toBe(2 * p.name.size);
    });
  });

  it('is plain data: the same input gives the same layout', () => {
    const sides = alternating(7, 'right');
    expect(JSON.parse(JSON.stringify(valleyLayout({ sides })))).toEqual(valleyLayout({ sides }));
  });

  it('has a straight path and no places without places', () => {
    const layout = valleyLayout({ sides: [] });
    expect(layout.places).toEqual([]);
    expect(valleyProblems(layout)).toEqual([]);
  });
});

describe('valleyProblems', () => {
  it('finds a slot moved onto the path, out of the scene, or a bay on the wrong side', () => {
    const layout = valleyLayout({ sides: alternating(3, 'right') });
    const [first, second] = layout.places;
    if (!first || !second) throw new Error('three places');
    first.plot = { ...first.plot, x: first.bend.x - 10 };
    second.name = { ...second.name, x: -20 };
    second.bay = { ...second.bay, cx: second.bend.x + second.bay.rx };
    const at = valleyProblems(layout).map((p) => `${p.at}: ${p.message}`);
    expect(at).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^place 1 plot: .* from the path's centre line/),
        'place 1 slot: lies outside its plot',
        'place 2 name: leaves the scene',
        expect.stringMatching(/^place 2 bay: crosses the centre line/),
      ]),
    );
  });

  it('finds a name box too narrow and boxes that overlap', () => {
    const layout = valleyLayout({ sides: alternating(2, 'right') });
    const [first, second] = layout.places;
    if (!first || !second) throw new Error('two places');
    first.name = { ...first.name, width: 30 };
    second.plot = { ...first.plot };
    const at = valleyProblems(layout).map((p) => `${p.at}: ${p.message}`);
    expect(at).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^place 1 name: 30 wide/),
        'place 1 plot: overlaps place 2 plot',
      ]),
    );
  });

  it('finds a thing behind moved onto the path, over the doorstep or in front, and a name of one line', () => {
    const layout = valleyLayout({ sides: alternating(2, 'right'), things: [3, 2] });
    const [first, second] = layout.places;
    const behind = first?.things[1];
    const back = second?.things[1];
    if (!first || !second || !behind || !back) throw new Error('things behind');
    first.things[2] = { ...behind, x: first.bend.x - 5 };
    second.things[1] = { ...back, y: second.slot.y + second.slot.height - back.height + 4 };
    first.things[1] = { ...behind, x: first.doorstep.x - 5, y: first.doorstep.y - 5 };
    second.name = { ...second.name, height: second.name.lineHeight };
    const at = valleyProblems(layout).map((p) => `${p.at}: ${p.message}`);
    expect(at).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^place 1 thing 3: .* from the path's centre line/),
        'place 1 thing 2: covers the doorstep',
        'place 2 thing 2: does not stand behind the one in front',
        'place 2 name: holds fewer than two lines',
      ]),
    );
  });
});
