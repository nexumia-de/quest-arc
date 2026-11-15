import { describe, expect, it } from 'vitest';
import { ladderProblems } from '../src/art-ladder-check';

// The ladder checker on a ladder that passes, and on broken copies
// (docs/journey-design.md, "Builds and ladders"). A synthetic ladder on
// water, so a build on water stays tested though no ladder of the Valley
// has water (#128).
const names = [
  'setting-river',
  'build-x-1',
  'build-x-2',
  'build-x-3',
  'tree',
  'tuft',
  ...[1, 2].flatMap((k) => [`marker-flower-${k}`, `marker-flower-${k}-open`]),
];
const hues = ['water', 'meadow'];
const whole = { x: 0, y: 0, width: 320, height: 180 };
const slot = { band: 'middle', x: 55, y: 10.5, width: 210, height: 140 };
const ladder = {
  title: 'Bridge',
  hue: 'water',
  width: 320,
  height: 180,
  water: true,
  // the walking surface meets the path at x = 14 and x = 106, y 57–64
  ways: [
    [
      [14, 57],
      [14, 64],
    ],
    [
      [106, 57],
      [106, 64],
    ],
  ],
  versions: [
    { art: 'build-x-1', title: 'Stones' },
    { art: 'build-x-2', title: 'A log' },
    { art: 'build-x-3', title: 'A bridge' },
  ],
  pictures: [
    { art: 'setting-river', ...whole },
    // feet at y + 15/16 of the size: 21.25 + 18.75 = 40
    { art: 'tree', band: 'far', x: 30, y: 21.25, width: 20, height: 20 },
    { slot: 'lantern', band: 'middle', x: 8, y: 107.125, width: 34, height: 34 },
    // a build stands on y = 74 of 80: 10.5 + 140 × 74/80 = 140
    { slot: 'build', band: 'middle', x: 55, y: 10.5, width: 210, height: 140 },
    { art: 'tree', band: 'middle', x: 40, y: 117.5, width: 24, height: 24 },
    // the marker: two flowers in the build's slot, in the order they grow
    { slot: 'marker', order: 1, art: 'marker-flower-1', ...slot },
    { slot: 'marker', order: 2, art: 'marker-flower-2', ...slot },
    { art: 'tuft', band: 'near', x: 290, y: 152, width: 20, height: 20 },
  ],
};
const svg = (shapes: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><title>x</title>${shapes}</svg>`;
// Way points in the setting: 55 + 14 × 1.75 = 79.5, 10.5 + 57 × 1.75 = 110.25 …
const sources = {
  'build-x-1': svg(
    '<rect class="fg" x="14" y="57" width="12" height="7"/><rect class="fg" x="94" y="57" width="12" height="7"/>',
  ),
  'build-x-2': svg('<rect class="fg" x="14" y="57" width="92" height="7" rx="3"/>'),
  'build-x-3': svg('<path class="fg" d="M14 57H106V64H14Z"/>'),
  'setting-river': svg(
    '<path class="bg" d="M0 106C30 106 56 110.3 79.5 110.3V122.5C56 122.5 30 124 0 125Z"/><polygon class="bg" points="240.5,110.3 320,104 320,117 240.5,122.5"/>',
  ),
};
const at = (value: unknown, withSources = false) =>
  ladderProblems(value, names, hues, withSources ? sources : undefined).map((p) => p.at);
const withPicture = (index: number, change: Record<string, unknown>) => ({
  ...ladder,
  pictures: ladder.pictures.map((p, i) => (i === index ? { ...p, ...change } : p)),
});

describe('ladderProblems', () => {
  it('passes a ladder whose versions stand in one slot of one setting', () => {
    expect(ladderProblems(ladder, names, hues, sources)).toEqual([]);
  });

  it('fails a missing title, an unknown hue and another size', () => {
    expect(at({ ...ladder, title: '', hue: 'gold', height: 120 })).toEqual([
      'title',
      'hue',
      'size',
    ]);
  });

  it('wants at least three versions of build pictures', () => {
    expect(at({ ...ladder, versions: ladder.versions.slice(0, 2) })).toContain('versions');
    const versions = [
      { art: 'tree', title: 'A tree' },
      { art: 'build-x-2', title: '' },
      { art: 'build-x-3', title: 'A bridge' },
    ];
    expect(at({ ...ladder, versions })).toEqual(['versions[0]', 'versions[1]']);
  });

  it('wants the setting first', () => {
    expect(at(withPicture(0, { art: 'tree' }))).toEqual(['pictures[0]']);
    expect(at(withPicture(0, { width: 300 }))).toEqual(['pictures[0]']);
  });

  it('wants exactly one of each slot and the build in the fixed slot', () => {
    const noLantern = { ...ladder, pictures: ladder.pictures.filter((p) => p.slot !== 'lantern') };
    expect(at(noLantern)).toEqual(['pictures']);
    // The slot for a worn-down guardian is gone with the guardians (#110).
    expect(at(withPicture(2, { slot: 'keeper' }))).toContain('pictures[2]');
    expect(at(withPicture(3, { width: 180 }))).toContain('pictures[3]');
    expect(at(withPicture(2, { slot: 'scaffold' }))).toContain('pictures[2]');
    expect(at(withPicture(2, { slot: 'flag' }))).toContain('pictures[2]');
  });

  it('wants the row crop 3 : 2 inside the build if there is one', () => {
    expect(at({ ...ladder, row: [30, 38, 60, 40] })).toEqual([]);
    expect(at({ ...ladder, row: [21, 28, 78, 60] })).toEqual(['row']);
    expect(at({ ...ladder, row: [60, 28, 78, 52] })).toEqual(['row']);
    expect(at({ ...ladder, row: 'middle' })).toEqual(['row']);
  });

  it('wants water said, true or false', () => {
    expect(at({ ...ladder, water: false })).toEqual([]);
    expect(at({ ...ladder, water: undefined })).toEqual(['water']);
  });

  it('wants the marker as flowers in the build slot, in the order they grow', () => {
    expect(at(withPicture(5, { order: 2 }))).toEqual(['pictures[5]', 'pictures[5]']);
    expect(at(withPicture(6, { art: 'tree' }))).toEqual(['pictures[6]']);
    expect(at(withPicture(6, { x: 60 }))).toEqual(['pictures[6]']);
    expect(at(withPicture(6, { band: 'near' }))).toEqual(['pictures[6]']);
    // an open form is needed too
    expect(
      ladderProblems(
        ladder,
        names.filter((name) => name !== 'marker-flower-2-open'),
        hues,
      ).map((p) => p.at),
    ).toEqual(['pictures[6]']);
    // before the build, a flower has no slot to fill
    const first = {
      ...ladder,
      pictures: [ladder.pictures[0], ladder.pictures[5], ...ladder.pictures.slice(1, 5)],
    };
    expect(at(first)).toContain('pictures[1]');
    const one = { ...ladder, pictures: ladder.pictures.filter((p) => p.art !== 'marker-flower-2') };
    expect(at(one)).toEqual(['marker']);
  });

  it('wants band sizes, feet inside the band and back-to-front order', () => {
    expect(at(withPicture(1, { width: 24, height: 24 }))).toEqual(['pictures[1]']);
    expect(at(withPicture(7, { y: 100 }))).toEqual(['pictures[7]', 'pictures[7]']);
  });

  it('wants every version and the setting to meet the path at the way points', () => {
    expect(at(ladder, true)).toEqual([]);
    expect(at({ ...ladder, ways: [] })).toEqual(['ways']);
    expect(at({ ...ladder, ways: [[[14, 57]]] })).toEqual(['ways[0]']);
    const moved = {
      ...ladder,
      ways: [
        ladder.ways[0],
        [
          [100, 50],
          [100, 64],
        ],
      ],
    };
    expect(at(moved, true)).toEqual(['versions[0]', 'versions[1]', 'versions[2]', 'ways[1]']);
  });
});
