import { describe, expect, it } from 'vitest';
import homeFile from '../../../content/art/home.ladder.json';
import wellFile from '../../../content/art/well.ladder.json';
import type { BuildView, Journey } from '@questarc/engine';
import '../src/shared/languages';
import { buildState } from '../src/ui/journey/build';
import {
  appearing,
  buildLabel,
  buildWords,
  elementsShown,
  markerCount,
  ladderScene,
  markerElements,
  rowViewBox,
  type BuildState,
  type Ladder,
} from '../src/ui/ladder';

// The scene of a ladder (docs/journey-design.md, "Builds and ladders"):
// the slots filled by state, never a count. Day Planner's `ladder_scene`
// composes the same (nexumia-de/pensum tests/test_art.py).
const home = homeFile as unknown as Ladder;
const well = wellFile as unknown as Ladder;
// No ladder of the Valley has water, a zoomed row or a plural version
// title since Crossing was retired (#128); the rules stay, so a synthetic
// ladder on Well's setting keeps them tested, with Well's six flowers.
const span: Ladder = {
  ...well,
  title: 'Span',
  water: true,
  row: [30, 38, 60, 40],
  versions: [
    'Stepping stones',
    'A log',
    'A plank bridge',
    'A stone bridge',
    'A covered bridge',
  ].map((title, i) => ({ art: `build-span-${i + 1}`, title })),
};
const arts = (version: number, state: BuildState = {}, ladder = span) =>
  ladderScene(ladder, version, state).pictures.map((p) => p.art);
const marks = (version: number, state: BuildState, ladder = span) =>
  arts(version, state, ladder).filter((a) => a.startsWith('marker-'));

describe('ladderScene', () => {
  it('puts the standing version in the build slot, the setting first', () => {
    const scene = ladderScene(well, 3);
    expect(scene.pictures[0]?.art).toBe('setting-green');
    expect(arts(3, {}, well).filter((a) => a.startsWith('build-'))).toEqual(['build-well-3']);
    expect(marks(3, {}, well)).toEqual([]);
    expect(scene.title).toBe('A well with a winch stands');
  });

  it('counts the flowers: six for every ladder (#152)', () => {
    expect(markerElements(home)).toBe(6);
    expect(markerElements(well)).toBe(6);
    expect(elementsShown(home, 0)).toBe(0);
    expect(elementsShown(home, 0.01)).toBe(1);
    expect(elementsShown(home, 3 / 6)).toBe(3);
    expect(elementsShown(home, 1)).toBe(6);
    // a days stage of 5 and a count stage of 20 fill the same marker
    expect(elementsShown(home, 3 / 5)).toBe(elementsShown(home, 12 / 20));
  });

  it('grows flower by flower, in bud, each in the thing own box', () => {
    expect(marks(3, { progress: 1 / 6 }, home)).toEqual(['marker-flower-1']);
    expect(marks(3, { progress: 3 / 6 }, home)).toEqual([
      'marker-flower-1',
      'marker-flower-2',
      'marker-flower-3',
    ]);
    const scene = ladderScene(home, 3, { progress: 1 / 6 });
    const at = (art: string) => scene.pictures.findIndex((p) => p.art === art);
    const box = (i: number) => {
      const p = scene.pictures[i];
      return p && [p.x, p.y, p.width, p.height];
    };
    expect(box(at('marker-flower-1'))).toEqual(box(at('build-home-3')));
    // in front of the thing: drawn after it
    expect(at('marker-flower-1')).toBeGreaterThan(at('build-home-3'));
    expect(ladderScene(span, 3, { progress: 0.5 }).title).toBe(
      'A plank bridge stands, a stone bridge is on its way',
    );
  });

  it('opens every flower when ready', () => {
    const on = marks(3, { ready: true, progress: 0.5 }, home);
    expect(on).toHaveLength(6);
    expect(on.every((a) => a.endsWith('-open'))).toBe(true);
    expect(ladderScene(span, 3, { ready: true }).title).toBe(
      'A plank bridge stands, a stone bridge is ready',
    );
  });

  it('shows no marker after the last version and lights the lantern', () => {
    const list = arts(5, { ready: true, graduated: true }, home);
    expect(list.filter((a) => a.startsWith('marker-'))).toEqual([]);
    expect(list.filter((a) => a === 'lantern')).toHaveLength(1);
  });

  it('says the state in words, never a building site', () => {
    expect(buildWords(span, 1, { progress: 0.1 })).toBe(
      'Stepping stones stand · a log is on its way',
    );
    expect(buildWords(home, 3, { ready: true })).toBe('A hut stands · a cottage is ready');
    expect(buildWords(home, 5, { progress: 1 })).toBe('A house stands');
  });

  it('zooms the row of versions where the ladder says so', () => {
    expect(rowViewBox(span)).toBe('30 38 60 40');
    expect(rowViewBox(home)).toBe('0 0 120 80');
  });
});

// The journey screen with the build (#100): names, the label for screen
// readers, the journey's own version count and what appears at the tick.
describe('the build on the journey screen', () => {
  it('says the state in words, with the journey own names where given', () => {
    expect(buildWords(span, 3, { progress: 0.5 })).toBe(
      'A plank bridge stands · a stone bridge is on its way',
    );
    expect(buildWords(span, 1, { progress: 0.5 })).toBe(
      'Stepping stones stand · a log is on its way',
    );
    expect(buildWords(span, 3, { progress: 0 })).toBe('A plank bridge stands');
    expect(
      buildWords(span, 3, {
        ready: true,
        names: [undefined, undefined, 'The Morning Bridge', 'The Stone Way'],
      }),
    ).toBe('The Morning Bridge stands · The Stone Way is ready');
  });

  it("shows the journey's names only on the journey's own ladder (#115)", () => {
    const journey = {
      build: { ladder: 'well', names: ['ui.build.given'] },
    } as unknown as Journey;
    const view = (ladder: string) =>
      ({ ladder, markerProgress: 0, ready: false, versions: 5 }) as unknown as BuildView;
    expect(buildState(view('well'), journey).names).toHaveLength(1);
    const other = buildState(view('home'), journey);
    expect(other.names).toBeUndefined();
    expect(buildWords(home, 1, other)).toBe(buildWords(home, 1, { progress: 0 }));
  });

  it('names the flowers in numbers for screen readers', () => {
    expect(buildLabel(span, 3, { progress: 3 / 6 })).toBe(
      'A plank bridge, version 3 of 5; 3 of 6 flowers, in bud; not ready yet',
    );
    expect(buildLabel(home, 2, { ready: true })).toBe(
      'A tent, version 2 of 5; 6 of 6 flowers, open; ready',
    );
    expect(buildLabel(home, 2, {})).toBe('A tent, version 2 of 5; nothing on its way yet');
    expect(buildLabel(home, 5, { progress: 1 })).toBe(
      'A house, version 5 of 5; all versions stand',
    );
  });

  it('follows the journey version count: more versions than pictures reuse the last', () => {
    const six = { versions: 6, progress: 0.5 };
    expect(arts(6, six, well).filter((a) => a.startsWith('build-'))).toEqual(['build-well-5']);
    expect(marks(5, six, well).length).toBeGreaterThan(0);
    expect(marks(6, six, well)).toEqual([]);
    expect(markerCount(well, 5, six)).toEqual({ flowers: 6, shown: 3 });
    // a journey with fewer stages ends earlier: no marker on its last version
    expect(marks(3, { versions: 3, progress: 0.5 }, well)).toEqual([]);
  });

  it('lets only what is new appear, and nothing on the first draw', () => {
    const at = (version: number, shown: number, key = 'r/well') => ({
      key,
      version,
      shown,
    });
    expect(appearing(undefined, at(3, 4))).toEqual({ version: false, fromOrder: Infinity });
    expect(appearing(at(3, 4), at(3, 4))).toEqual({ version: false, fromOrder: Infinity });
    expect(appearing(at(3, 4), at(3, 6))).toEqual({ version: false, fromOrder: 5 });
    expect(appearing(at(3, 8), at(4, 0))).toEqual({ version: true, fromOrder: 1 });
    expect(appearing(at(3, 4), at(3, 6, 'r/home'))).toEqual({
      version: false,
      fromOrder: Infinity,
    });
  });
});
