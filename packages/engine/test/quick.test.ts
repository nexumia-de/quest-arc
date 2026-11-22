import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  evaluate,
  forgetJourney,
  JOURNEY_RECORD_LIMIT,
  keepJourney,
  ownJourneys,
  proposeSteps,
  quickJourney,
  textsIn,
} from '../src';
import type { QuickAnswers, Snapshot } from '../src';

// The quick journey (docs/story-format.md; issue #89): the vectors in
// vectors/quick hold the form's answers and the whole expected result,
// with the texts of content/i18n; Node and gjs must give the same.
const root = join(import.meta.dirname, '..', '..', '..');
const dir = join(import.meta.dirname, '..', 'vectors', 'quick');
const table = (language: string): Record<string, string> =>
  JSON.parse(readFileSync(join(root, 'content', 'i18n', `${language}.json`), 'utf8'));
const ui = { en: table('en'), de: table('de') };
const vectors = readdirSync(dir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => ({
    file,
    ...(JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
      answers: QuickAnswers;
      expect: unknown;
    }),
  }));
const texts = (answers: QuickAnswers) => textsIn(ui, answers.language);

const cli = join(import.meta.dirname, '..', 'dist', 'engine-cli.mjs');
const gjs = spawnSync('gjs', ['--version']).status === 0 ? 'gjs' : null;

describe('quick journey vectors', () => {
  it('finds the vectors', () => expect(vectors.length).toBeGreaterThan(3));

  it.each(vectors.map((v) => [v.file, v] as const))('%s in Node', (_file, vector) => {
    const result = JSON.parse(JSON.stringify(quickJourney(vector.answers, texts(vector.answers))));
    expect(result).toEqual(vector.expect);
  });

  it.skipIf(!gjs)('gives the same in gjs', () => {
    expect(existsSync(cli)).toBe(true);
    const answers = JSON.parse(
      execFileSync(gjs as string, ['-m', cli], {
        input: JSON.stringify({
          batch: vectors.map((v) => ({ quick: { answers: v.answers, texts: texts(v.answers) } })),
        }),
        encoding: 'utf8',
        // gjs prints umlauts as question marks in a locale that is not installed
        env: { ...process.env, LC_ALL: 'C.UTF-8' },
      }),
    ) as unknown[];
    vectors.forEach((vector, i) => expect(answers[i], vector.file).toEqual(vector.expect));
  });
});

describe('proposeSteps', () => {
  it.each([
    [2, 20, [2, 4, 10, 20]],
    [1, 30, [1, 2, 6, 12, 30]],
    [5, 60, [5, 12, 25, 60]],
    [1, 2, [1, 2]],
    [1, 3, [1, 2, 3]],
    [10, 10, [10]],
    [20, 5, [20]],
    [100, 1000, [100, 200, 500, 1000]],
    ['x', 0.2, [1]],
  ])('%s to %s', (first, last, steps) => expect(proposeSteps(first, last)).toEqual(steps));
});

describe("journeys of the user's own", () => {
  const made = quickJourney(vectors[2]?.answers as QuickAnswers, ui.en);
  const day = { todayStr: '2026-11-02', startOfNextDayDiffMs: 0, timeZone: 'Europe/Berlin' };
  const snapshot = (choices: Record<string, unknown>, journeys: unknown[] = []): Snapshot =>
    ({ day, tasks: [], repeatCfgs: [], journeys, choices }) as unknown as Snapshot;

  it('keeps a journey that passes as one record', () => {
    const kept = keepJourney({ journey: made.journey, builtIn: ['walk-after-lunch'] });
    expect(kept.changes).toEqual({ [`journey:${made.journey.id}`]: made.journey });
    expect(kept.problems.filter((p) => p.level === 'error')).toEqual([]);
  });

  it('keeps nothing with an error or a built-in id', () => {
    expect(keepJourney({ journey: { format: 3 }, builtIn: [] }).changes).toEqual({});
    const taken = keepJourney({ journey: made.journey, builtIn: [made.journey.id] });
    expect(taken.changes).toEqual({});
    expect(taken.problems[0]?.at).toBe('id');
  });

  it('never lets a record replace a built-in journey', () => {
    const builtIn = { ...made.journey, version: 7 };
    const view = evaluate(snapshot({ [`journey:${builtIn.id}`]: made.journey }, [builtIn]));
    expect(view.problems).toEqual([`journey ${builtIn.id}: a built-in journey has this id`]);
  });

  it('forgets a journey only while no run uses it', () => {
    const key = `journey:${made.journey.id}`;
    const free = evaluate(snapshot({ [key]: made.journey }));
    expect(forgetJourney(free, made.journey.id)).toEqual({ [key]: '' });
    const walked = evaluate(
      snapshot({
        [key]: made.journey,
        'run:r1': { journeyId: made.journey.id, journeyVersion: 1, startDay: '2026-11-02' },
        'stage:r1:step-1': { acceptedDay: '2026-11-02' },
      }),
    );
    expect(walked.active?.journeyId).toBe(made.journey.id);
    expect(forgetJourney(walked, made.journey.id)).toEqual({});
  });
});

describe('journey files of the user (#40)', () => {
  const made = quickJourney(vectors[2]?.answers as QuickAnswers, ui.en);
  const day = { todayStr: '2026-11-02', startOfNextDayDiffMs: 0, timeZone: 'Europe/Berlin' };
  const key = `journey:${made.journey.id}`;

  it('lists the valid journeys of the own records, sorted, never a built-in id', () => {
    const second = { ...made.journey, id: 'own-a-second' };
    const records = {
      [key]: made.journey,
      'journey:own-a-second': second,
      'journey:broken': { format: 3 },
      'journey:walk-after-lunch': { ...made.journey, id: 'walk-after-lunch' },
      'journey:withdrawn': '',
      'journey:own-other-key': made.journey,
      'run:r1': { journeyId: 'x' },
    };
    expect(ownJourneys(records, ['walk-after-lunch']).map((j) => j.id)).toEqual([
      'own-a-second',
      made.journey.id,
    ]);
  });

  it('does not replace a journey a run walks', () => {
    const view = evaluate({
      day,
      tasks: [],
      repeatCfgs: [],
      journeys: [],
      choices: {
        [key]: made.journey,
        'run:r1': { journeyId: made.journey.id, journeyVersion: 1, startDay: '2026-11-02' },
        'stage:r1:step-1': { acceptedDay: '2026-11-02' },
      },
    } as unknown as Snapshot);
    const kept = keepJourney({ journey: made.journey, builtIn: [], view });
    expect(kept.changes).toEqual({});
    expect(kept.problems[0]?.at).toBe('id');
    const free = evaluate({
      day,
      tasks: [],
      repeatCfgs: [],
      journeys: [],
      choices: { [key]: made.journey },
    } as unknown as Snapshot);
    expect(keepJourney({ journey: made.journey, builtIn: [], view: free }).changes).toEqual({
      [key]: made.journey,
    });
  });

  it('refuses a journey larger than a record may be', () => {
    const big = { ...made.journey, description: 'x'.repeat(JOURNEY_RECORD_LIMIT) };
    const kept = keepJourney({ journey: big, builtIn: [] });
    expect(kept.changes).toEqual({});
    expect(kept.problems.some((p) => p.level === 'error' && p.message.includes('bytes'))).toBe(
      true,
    );
  });
});
