import type { Task } from '@super-productivity/plugin-api';

import type { DemoData } from './demo';
import { own } from './demo-words';

/**
 * Demo datasets for the Valley as the home (#129, never real tasks): one,
 * three and six places, in the order of the day. Walk after lunch grows
 * (station 2), the others are finished (a lantern where the routine runs
 * by itself, flowers where it is still followed) or wait.
 *
 * 1: lunch (the growing walk).
 * 3: getting up (finished, runs by itself), lunch (growing), evening
 *    (waiting).
 * 6: getting up, desk, lunch, dinner, bedtime reading and evening.
 * valley-6-stacked (#151): the same six, with two things at the desk
 *    and bedtime and three at dinner (further journeys from the same
 *    moment).
 * place-<home|garden>-<1|2|3> (#151): one place with one to three things
 *    of that ladder, the last journey growing at station 2.
 */

export const VALLEY_SCENARIOS = [
  'valley-1',
  'valley-3',
  'valley-6',
  'valley-6-stacked',
  'place-home-1',
  'place-home-2',
  'place-home-3',
  'place-garden-1',
  'place-garden-2',
  'place-garden-3',
] as const;
export type ValleyScenario = (typeof VALLEY_SCENARIOS)[number];

export const isValleyScenario = (scenario: string): scenario is ValleyScenario =>
  (VALLEY_SCENARIOS as readonly string[]).includes(scenario);

const DAY_MS = 86_400_000;

export const valleyDemo = (scenario: ValleyScenario, today: string): DemoData => {
  const stacked = scenario === 'valley-6-stacked';
  const count = stacked ? 6 : Number(scenario.slice('valley-'.length));
  const data: Record<string, string> = {};
  const tasks: DemoData['tasks'] = {};
  const repeatCfgs: DemoData['repeatCfgs'] = {};
  const todayMs = Date.parse(`${today}T12:00:00Z`);
  const day = (offset: number): string =>
    new Date(todayMs - offset * DAY_MS).toISOString().slice(0, 10);
  const record = (key: string, value: unknown) => {
    data[key] = JSON.stringify(value);
  };
  const repeat = (id: string, title: string, start: number, done: number[]) => {
    repeatCfgs[id] = {
      id,
      title,
      isPaused: false,
      repeatCycle: 'DAILY',
      repeatEvery: 1,
      startDay: day(start),
    };
    for (const offset of done) {
      const d = day(offset);
      tasks[`rpt_${id}_${d}`] = {
        id: `rpt_${id}_${d}`,
        title,
        isDone: true,
        doneOn: Date.parse(`${d}T07:30:00Z`),
        repeatCfgId: id,
        dueDay: d,
        created: Date.parse(`${d}T12:00:00Z`),
        timeSpentOnDay: {},
      } as Partial<Task> & { id: string };
    }
  };
  /** A finished journey: its stages 15 days apart, the last one `end` days ago. */
  const finished = (run: string, journeyId: string, stages: string[], end: number) => {
    const start = end + stages.length * 15;
    record(`run:${run}`, { journeyId, journeyVersion: 1, startDay: day(start) });
    stages.forEach((stage, i) => {
      record(`stage:${run}:${stage}`, { acceptedDay: day(start - i * 15) });
      record(`stage-done:${run}:${stage}`, { day: day(start - (i + 1) * 15), dataFormat: 2 });
    });
    record(`run-end:${run}`, { day: day(end), reason: 'finished' });
  };
  /** The habit of a finished journey, still followed: a daily task with its binding. */
  const followed = (run: string, last: string, title: string) => {
    record(`binding:${run}:${last}`, {
      taskId: `rpt_${run}_${day(35)}`,
      repeatCfgId: run,
      day: day(35),
    });
    repeat(
      run,
      title,
      35,
      Array.from({ length: 35 }, (_, i) => i + 1).filter((offset) => offset !== 9),
    );
  };
  /** A journey that waits at its first station. */
  const waiting = (run: string, journeyId: string, first: string) => {
    record(`run:${run}`, { journeyId, journeyVersion: 1, startDay: day(12) });
    record(`stage:${run}:${first}`, { acceptedDay: day(12) });
    record(`pause:${run}:${day(10)}`, { action: 'pause', source: 'user' });
  };
  const at = (run: string, anchor: string) => record(`run-anchor:${run}`, { anchorId: anchor });
  /** A journey growing at its second station, today open. */
  const growing = (run: string, journeyId: string, [first, second]: string[], title: string) => {
    record(`run:${run}`, { journeyId, journeyVersion: 1, startDay: day(10) });
    record(`stage:${run}:${first}`, { acceptedDay: day(10) });
    record(`stage-done:${run}:${first}`, { day: day(5), dataFormat: 2 });
    record(`stage:${run}:${second}`, { acceptedDay: day(5) });
    record(`binding:${run}:${second}`, {
      taskId: `rpt_${run}_${day(5)}`,
      repeatCfgId: run,
      day: day(5),
    });
    repeat(run, title, 5, [5, 4, 2, 1]);
  };

  // One place with one to three things (#151): the first journey builds the
  // ladder, the last one grows.
  const one = /^place-(home|garden)-(\d)$/.exec(scenario);
  if (one) {
    const [, ladder, n] = one;
    const things = Number(n);
    const firstJourney =
      ladder === 'home'
        ? { id: 'pages-before-sleep', stages: ['one-page', 'read-5', 'read-10', 'read-20'] }
        : { id: 'tidy-a-little', stages: ['one-thing', 'table', 'counter', 'one-more'] };
    record('anchor:here', {
      kind: 'routine',
      words: own(ladder === 'home' ? 'brushing my teeth' : 'dinner'),
    });
    if (things === 1) growing('demo', firstJourney.id, firstJourney.stages, own('One small step'));
    else {
      finished('first', firstJourney.id, firstJourney.stages, 70);
      at('first', 'here');
      if (things === 3) {
        finished('second', 'gentle-morning', ['water', 'stretch-1', 'stretch-5', 'plan-day'], 30);
        at('second', 'here');
      }
      growing('demo', 'walk-after-lunch', ['door', 'walk-5'], own('Walk after lunch'));
    }
    at('demo', 'here');
    return { tasks, repeatCfgs, data };
  }

  const places = {
    morning: count >= 3 || count === 6,
    desk: count === 6,
    noon: true,
    dinner: count === 6,
    bed: count === 6,
    evening: count >= 3,
  };

  if (places.morning) {
    record('anchor:morning', { kind: 'routine', words: own('getting up') });
    finished('morning', 'gentle-morning', ['water', 'stretch-1', 'stretch-5', 'plan-day'], 60);
    record(`graduation:morning:plan-day:${day(30)}`, { choice: 'end' });
    at('morning', 'morning');
  }
  if (places.desk) {
    record('anchor:desk', { kind: 'routine', words: own('sitting down at my desk') });
    finished(
      'desk',
      'first-things-first',
      ['one-thing', 'focus-15', 'focus-45', 'focus-mail', 'look-back'],
      40,
    );
    followed('desk', 'look-back', own('Look back at my week'));
    at('desk', 'desk');
    if (stacked) {
      finished('desk-2', 'gentle-morning', ['water', 'stretch-1', 'stretch-5', 'plan-day'], 15);
      at('desk-2', 'desk');
    }
  }
  // The growing step: a walk after lunch at station 2, today open.
  record('anchor:noon', { kind: 'routine', words: own('lunch') });
  record('run:demo', { journeyId: 'walk-after-lunch', journeyVersion: 1, startDay: day(10) });
  record('stage:demo:door', { acceptedDay: day(10) });
  record('stage-done:demo:door', { day: day(5), dataFormat: 2 });
  record('stage:demo:walk-5', { acceptedDay: day(5) });
  record('binding:demo:walk-5', {
    taskId: `rpt_demo_${day(5)}`,
    repeatCfgId: 'demo',
    day: day(5),
  });
  repeat('demo', own('Walk after lunch'), 5, [5, 4, 2, 1]);
  at('demo', 'noon');
  if (places.dinner) {
    record('anchor:dinner', { kind: 'routine', words: own('dinner') });
    if (stacked) {
      // three things: two finished journeys and one that waits
      finished('tidy', 'tidy-a-little', ['one-thing', 'table', 'counter', 'one-more'], 50);
      finished('dinner-2', 'evening-wind-down', ['charger', 'calm-2', 'calm-10', 'lights-out'], 8);
      waiting('dinner-3', 'first-things-first', 'one-thing');
      at('dinner-2', 'dinner');
      at('dinner-3', 'dinner');
    } else waiting('tidy', 'tidy-a-little', 'one-thing');
    at('tidy', 'dinner');
  }
  if (places.bed) {
    record('anchor:bed', { kind: 'routine', words: own('brushing my teeth') });
    finished('pages', 'pages-before-sleep', ['one-page', 'read-5', 'read-10', 'read-20'], 20);
    followed('pages', 'read-20', own('Read in my book'));
    at('pages', 'bed');
    if (stacked) {
      finished('bed-2', 'tidy-a-little', ['one-thing', 'table', 'counter', 'one-more'], 4);
      at('bed-2', 'bed');
    }
  }
  if (places.evening) {
    record('anchor:evening', { kind: 'time', time: '21:30', name: own('Evening') });
    waiting('wind', 'evening-wind-down', 'charger');
    at('wind', 'evening');
  }
  return { tasks, repeatCfgs, data };
};
