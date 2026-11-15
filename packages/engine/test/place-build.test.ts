import { describe, expect, it } from 'vitest';

import { evaluate } from '../src';
import type { Snapshot } from '../src';
import { withLadder } from './synthetic-ladder';
import { loadVectors } from './vector-support';

/**
 * The place's thing on a ladder with more than five versions (issue #148):
 * the engine reads the count from the ladder list. Built on the vector
 * valley-further-cap.json; the JSON vectors cannot carry a ladder, so this
 * runs in Node only (the rule itself is the vectors' `valley-further-*`).
 */
const base = loadVectors().find((v) => v.file === 'valley-further-cap.json');
const input = (base as { input: Snapshot }).input as unknown as {
  choices: Record<string, unknown>;
  journeys: { id: string; build?: { ladder: string } }[];
};

const snapshot = (extra: Record<string, unknown>): Snapshot => {
  const journeys = structuredClone(input.journeys);
  const daily = journeys.find((j) => j.id === 'test-daily');
  if (daily) daily.build = { ladder: 'tall' };
  return {
    ...input,
    journeys,
    choices: { ...structuredClone(input.choices), ...extra },
  } as unknown as Snapshot;
};

describe('the place thing on a ladder of eight versions', () => {
  it('goes on from version 5 past what a five-version ladder holds', () => {
    withLadder('tall', 8, () => {
      const thing = evaluate(snapshot({})).valley[0]?.thing;
      // r1 finished (version 4); r2's two stations are versions 5 and 6
      expect(thing).toMatchObject({
        ladder: 'tall',
        version: 6,
        from: 4,
        added: [5, 6],
        versions: 7,
      });
    });
  });

  it('stays at the last version when there is no further one', () => {
    withLadder('tall', 8, () => {
      const view = evaluate(
        snapshot({
          'stage-done:r2:c': { day: '2026-10-10', dataFormat: 2 },
          'run-end:r2': { day: '2026-10-10', reason: 'finished' },
          'anchor:m1': { kind: 'routine', words: 'getting up' },
          'run:r3': { journeyId: 'test-night', journeyVersion: 1, startDay: '2026-10-20' },
          'run-anchor:r3': { anchorId: 'm1' },
          'stage:r3:a': { acceptedDay: '2026-10-20' },
          'stage-done:r3:a': { day: '2026-10-25', dataFormat: 2 },
          'stage:r3:b': { acceptedDay: '2026-10-25' },
          'stage-done:r3:b': { day: '2026-11-01', dataFormat: 2 },
        }),
      );
      // 3 + 3 + 2 finished stations: 9 stations, the ladder ends at version 8
      expect(view.valley[0]?.thing).toMatchObject({
        ladder: 'tall',
        version: 8,
        from: 7,
        added: [8],
        versions: 8,
      });
    });
  });

  it('falls back to the default ladder of five versions when the named ladder is unknown', () => {
    expect(evaluate(snapshot({})).valley[0]?.thing?.version).toBeLessThanOrEqual(5);
  });
});
