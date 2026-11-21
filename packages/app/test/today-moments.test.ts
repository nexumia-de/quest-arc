import { bindStage, nameAnchor, startJourney } from '@questarc/engine';
import type { AnchorView, GameView, RunView, ValleyPlace } from '@questarc/engine';
import { createBrain } from '@questarc/ui/adapter/brain';
import { builtInJourneys } from '@questarc/ui/shared/content';
import '@questarc/ui/shared/languages';
import { describe, expect, it } from 'vitest';

import { createHost } from '../src/host';
import { todayMoments } from '../src/screens/today-moments';
import { freshDataset, type StoredTask } from '../src/store/dataset';
import { todaysTasks } from '../src/store/habits';
import { memory, openStore } from '../src/store/store';

// Today by moments (#164, docs/behaviour.md "Today"): the grouping as
// data. The screen itself is walked in a browser (e2e/walk.mjs).
const journey = builtInJourneys.find((j) => j.id === 'gentle-morning');
const stage = journey?.stages[0];
if (!journey || !stage) throw new Error('no built-in journey');
const last = journey.stages.at(-1)?.id ?? '';
const DAY = '2026-03-02';

const task = (id: string, repeatCfgId: string): StoredTask =>
  ({ id, repeatCfgId, title: id, isDone: false, dueDay: DAY }) as unknown as StoredTask;
const place = (anchorId: string): ValleyPlace => ({ anchorId, name: anchorId }) as ValleyPlace;
const anchor = (id: string, words: string, steps: AnchorView['steps'] = []): AnchorView =>
  ({ id, kind: 'routine', words, state: 'resting', resting: [], steps, due: [] }) as AnchorView;
const run = (runId: string, anchorId: string | undefined, over: Partial<RunView> = {}): RunView =>
  ({
    runId,
    journeyId: journey.id,
    ...(anchorId ? { anchor: { id: anchorId, kind: 'routine' } } : {}),
    stations: journey.stages.map((s) => ({ stageId: s.id })),
    position: { stage: 0, progress: 0 },
    ...over,
  }) as RunView;
const game = (view: Partial<GameView>, records: Record<string, unknown>) => ({
  view: { paused: [], finished: [], anchors: [], valley: [], ...view } as GameView,
  journeys: builtInJourneys,
  records,
});
const titles = (moments: ReturnType<typeof todayMoments>) =>
  moments.map((m) => [m.title, ...m.rows.map((r) => `${r.growing ? '*' : ''}${r.task.id}`)]);

describe('Today by moments', () => {
  it('lists the moments in the order of the day, not of the tasks', () => {
    const moments = todayMoments(
      [task('evening', 'c2'), task('morning', 'c1'), task('other', 'c3')],
      game(
        {
          active: run('r1', 'a1'),
          finished: [run('r2', 'a2', { habit: { stageId: last, state: 'maintained' } as never })],
          anchors: [anchor('a2', 'dinner'), anchor('a1', 'getting up')],
          valley: [place('a1'), place('a2')],
        },
        {
          [`binding:r1:${stage.id}`]: { taskId: 'morning', repeatCfgId: 'c1' },
          [`binding:r2:${last}`]: { taskId: 'evening', repeatCfgId: 'c2' },
        },
      ),
    );
    expect(titles(moments)).toEqual([
      ['After getting up', '*morning'],
      ['After dinner', 'evening'],
      [undefined, 'other'],
    ]);
  });

  it('uses the name the user gave a moment', () => {
    const [moment] = todayMoments(
      [task('t', 'c1')],
      game(
        {
          active: run('r1', 'a1'),
          anchors: [{ ...anchor('a1', 'getting up'), name: 'Morning' }],
          valley: [place('a1')],
        },
        { [`binding:r1:${stage.id}`]: { taskId: 't', repeatCfgId: 'c1' } },
      ),
    );
    expect(moment?.title).toBe('Morning');
  });

  it('shows what runs by itself in a line and leaves its task out', () => {
    const habit = { stageId: last, state: 'graduated' } as never;
    const moments = todayMoments(
      [task('kept', 'c2')],
      game(
        {
          finished: [run('r2', 'a2', { habit })],
          anchors: [
            anchor('a2', 'dinner', [
              { runId: 'r2', journeyId: journey.id, stageId: last, state: 'graduated' },
            ]),
          ],
          valley: [place('a2')],
        },
        { [`binding:r2:${last}`]: { taskId: 'kept', repeatCfgId: 'c2' } },
      ),
    );
    expect(moments).toHaveLength(1);
    expect(moments[0]?.rows).toEqual([]);
    expect(moments[0]?.byItself).toHaveLength(1);
    expect(moments[0]?.byItself[0]).toMatch(/^[A-Z]/);
  });

  it('keeps a task that is also the growing step, whatever else it was bound to', () => {
    const habit = { stageId: last, state: 'graduated' } as never;
    const moments = todayMoments(
      [task('t', 'c1')],
      game(
        {
          active: run('r1', 'a1'),
          finished: [run('r2', 'a1', { habit })],
          anchors: [anchor('a1', 'getting up')],
          valley: [place('a1')],
        },
        {
          [`binding:r2:${last}`]: { taskId: 't', repeatCfgId: 'c1' },
          [`binding:r1:${stage.id}`]: { taskId: 't' },
        },
      ),
    );
    expect(titles(moments)).toEqual([['After getting up', '*t']]);
  });

  it('puts a journey from before moments and a moment without a place last, untitled', () => {
    const moments = todayMoments(
      [task('t', 'c1')],
      game(
        { active: run('r1', undefined), anchors: [], valley: [] },
        { [`binding:r1:${stage.id}`]: { taskId: 't', repeatCfgId: 'c1' } },
      ),
    );
    expect(titles(moments)).toEqual([[undefined, '*t']]);
  });

  it('is a plain list until the game is known, and nothing when nothing is due', () => {
    expect(titles(todayMoments([task('t', 'c1')], undefined))).toEqual([[undefined, 't']]);
    expect(todayMoments([], undefined)).toEqual([]);
    expect(todayMoments([], game({}, {}))).toEqual([]);
  });

  it('groups the task the app created under the moment of its journey', async () => {
    const store = await openStore(memory(), freshDataset);
    let ids = 0;
    const host = createHost({
      store,
      now: () => new Date(`${DAY}T08:00:00Z`),
      showSnack: () => undefined,
      selectTask: () => undefined,
      newId: () => `cfg${(ids += 1)}`,
    });
    const brain = createBrain({
      api: host.api,
      journeys: builtInJourneys,
      onEvents: () => undefined,
      debounceMs: 0,
    });
    await brain.write({
      ...nameAnchor({ anchorId: 'a1', anchor: { kind: 'routine', words: 'my first coffee' } }),
      ...startJourney({ runId: 'r', journey, startDay: DAY, anchor: { anchorId: 'a1' } }),
    });
    const made = await host.view.createHabit?.({ title: 'Water', schedule: stage.schedule });
    const state = await brain.write(
      bindStage({ runId: 'r', stageId: stage.id, taskId: made?.taskId ?? '', day: DAY, ...made }),
    );
    const moments = todayMoments(todaysTasks(store.data, DAY), state);
    expect(titles(moments)).toEqual([['After my first coffee', `*${made?.taskId}`]]);
    brain.stop();
  });
});
