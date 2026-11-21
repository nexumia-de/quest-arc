import { bindStage, nameAnchor, startJourney } from '@questarc/engine';
import { createBrain } from '@questarc/ui/adapter/brain';
import { registerHooks } from '@questarc/ui/adapter/hooks';
import { builtInJourneys } from '@questarc/ui/shared/content';
import { describe, expect, it } from 'vitest';

import { createHost } from '../src/host';
import { parseBackup, toBackup } from '../src/store/backup';
import { freshDataset, TODAY_ID, type Dataset } from '../src/store/dataset';
import {
  canChangeSchedule,
  isWontDo,
  leaveOut,
  leftOut,
  nextOccurrence,
  setPaused,
  setSchedule,
  takeBack,
  wontDo,
} from '../src/store/habit-actions';
import { createHabit, setDone, todaysTasks } from '../src/store/habits';
import { createInstances, localNoon } from '../src/store/instances';
import { memory, openStore } from '../src/store/store';

// What the user can do to a habit (#166). Every write is checked to
// leave a dataset that is still a backup Super Productivity takes: it
// survives the file unchanged, has no null or undefined field, and keeps
// the lists Super Productivity repairs when they are wrong. The import
// into a real Super Productivity is e2e/sp-import.mjs (CI).
const MONDAY = '2026-03-02';
const TUESDAY = '2026-03-03';
const WEDNESDAY = '2026-03-04';
const NOW = Date.parse(`${MONDAY}T08:00:00Z`);
const TASK = `rpt_c_${MONDAY}`;
const habit = (schedule: Parameters<typeof createHabit>[1]['schedule'] = { type: 'daily' }) =>
  createHabit(freshDataset(), { cfgId: 'c', title: 'Water', schedule, today: MONDAY }).data;
const cfgOf = (data: Dataset) => {
  const cfg = data.taskRepeatCfg.entities.c;
  if (!cfg) throw new Error('no config');
  return cfg;
};
const taskOf = (data: Dataset) => {
  const task = data.task.entities[TASK];
  if (!task) throw new Error('no task');
  return task;
};

const hasNothing = (value: unknown, path = ''): string[] =>
  value === undefined
    ? [path]
    : value === null || typeof value !== 'object'
      ? []
      : Object.entries(value).flatMap(([key, each]) => hasNothing(each, `${path}/${key}`));

/** The dataset is still a backup, and only `changed` fields differ from `before`. */
const importable = (data: Dataset, today: string, before?: Dataset): void => {
  const file = JSON.stringify(toBackup(data, NOW));
  expect(parseBackup(file)).toStrictEqual(data);
  expect(hasNothing(data)).toEqual([]);
  // New nulls would be fields set to null instead of removed.
  if (before) {
    const nulls = (d: Dataset) => (JSON.stringify(d).match(/:null/g) ?? []).length;
    expect(nulls(data)).toBe(nulls(before));
  }
  const live = data.task.ids.map((id) => data.task.entities[id]);
  expect(live.every((task) => task !== undefined)).toBe(true);
  expect(Object.keys(data.task.entities).sort()).toEqual([...data.task.ids].sort());
  // The Today tag lists exactly the live tasks due today.
  expect([...(data.tag?.entities[TODAY_ID]?.taskIds ?? [])].sort()).toEqual(
    live.flatMap((task) => (task?.dueDay === today ? [task.id] : [])).sort(),
  );
  // Every task is in its project and has its repeat.
  for (const task of live) {
    expect(data.project.entities[task?.projectId ?? '']?.taskIds).toContain(task?.id);
    expect(data.taskRepeatCfg.entities[task?.repeatCfgId ?? '']).toBeDefined();
  }
  // Planned days hold live tasks only, never today's.
  const planner = data.planner as { days?: Record<string, string[]> } | undefined;
  for (const [day, ids] of Object.entries(planner?.days ?? {})) {
    expect(day > today || ids.length === 0).toBe(true);
    for (const id of ids) expect(data.task.entities[id]?.dueDay).toBe(day);
  }
};

describe('won’t do', () => {
  it('finishes the task with wontDoOn equal to doneOn and changes nothing else', () => {
    const before = habit();
    const data = wontDo(before, TASK, NOW);
    expect(data.task.entities[TASK]).toEqual({
      ...before.task.entities[TASK],
      isDone: true,
      doneOn: NOW,
      wontDoOn: NOW,
    });
    expect(data.task.entities[TASK] && isWontDo(data.task.entities[TASK])).toBe(true);
    expect({ ...data, task: before.task }).toStrictEqual(before);
    expect(todaysTasks(data, MONDAY)).toHaveLength(1);
    importable(data, MONDAY, before);
  });

  it('leaves a done task and an unknown one alone', () => {
    const done = setDone(habit(), TASK, true, NOW);
    expect(wontDo(done, TASK, NOW + 1)).toBe(done);
    expect(wontDo(done, 'none', NOW)).toBe(done);
  });

  it('is undone by opening the task again, as Super Productivity does', () => {
    const before = habit();
    const open = setDone(wontDo(before, TASK, NOW), TASK, false, NOW + 1);
    const task = open.task.entities[TASK];
    expect(task).toEqual({ ...before.task.entities[TASK], wontDoOn: NOW });
    expect(task && isWontDo(task)).toBe(false);
    // Ticked off afterwards it is a completion: doneOn no longer matches.
    const ticked = setDone(open, TASK, true, NOW + 2).task.entities[TASK];
    expect(ticked && isWontDo(ticked)).toBe(false);
    importable(open, MONDAY, before);
  });
});

describe('leaving out a coming occurrence', () => {
  it('names the next occurrence after today that is not left out', () => {
    expect(nextOccurrence(cfgOf(habit()), MONDAY)).toBe(TUESDAY);
    const days = habit({ type: 'weekdays', days: ['mon', 'fri'] });
    expect(nextOccurrence(cfgOf(days), MONDAY)).toBe('2026-03-06');
    const skipped = leaveOut(days, 'c', '2026-03-06', MONDAY);
    expect(nextOccurrence(cfgOf(skipped), MONDAY)).toBe('2026-03-09');
  });

  it('adds the date to deletedInstanceDates and touches no task', () => {
    const before = habit();
    const data = leaveOut(before, 'c', TUESDAY, MONDAY);
    expect(cfgOf(data)).toEqual({ ...cfgOf(before), deletedInstanceDates: [TUESDAY] });
    expect(data.task).toBe(before.task);
    expect(leaveOut(data, 'c', TUESDAY, MONDAY)).toBe(data);
    expect(leftOut(cfgOf(data), MONDAY)).toEqual([TUESDAY]);
    importable(data, MONDAY, before);
    // No task is made on that day, and the day after has its own.
    const tuesday = createInstances(data, TUESDAY);
    expect(tuesday.task.ids).toEqual([TASK]);
    expect(createInstances(tuesday, WEDNESDAY).task.ids).toContain(`rpt_c_${WEDNESDAY}`);
  });

  it('refuses today and the past: there the task is finished as won’t do', () => {
    const before = habit();
    expect(leaveOut(before, 'c', MONDAY, MONDAY)).toBe(before);
    expect(leaveOut(before, 'c', '2026-03-01', MONDAY)).toBe(before);
  });

  it('takes it back while it is still to come', () => {
    const before = habit();
    const skipped = leaveOut(before, 'c', TUESDAY, MONDAY);
    const back = takeBack(skipped, 'c', TUESDAY, MONDAY);
    expect(cfgOf(back).deletedInstanceDates).toEqual([]);
    expect(takeBack(skipped, 'c', TUESDAY, TUESDAY)).toBe(skipped);
    expect(createInstances(back, TUESDAY).task.ids).toContain(`rpt_c_${TUESDAY}`);
    importable(back, MONDAY, before);
  });
});

describe('pausing and resuming', () => {
  it('pauses with isPaused alone; the open task stays', () => {
    const before = habit();
    const data = setPaused(before, 'c', true, MONDAY);
    expect(cfgOf(data)).toEqual({ ...cfgOf(before), isPaused: true });
    expect(data.task).toBe(before.task);
    expect(setPaused(data, 'c', true, MONDAY)).toBe(data);
    expect(createInstances(data, WEDNESDAY).task).toBe(data.task);
    importable(data, MONDAY, before);
  });

  it('resumes without making up for the days of the pause', () => {
    const paused = setPaused(habit(), 'c', true, MONDAY);
    const friday = '2026-03-06';
    const data = setPaused(paused, 'c', false, friday);
    expect(cfgOf(data)).toMatchObject({ isPaused: false, lastTaskCreationDay: friday });
    expect(cfgOf(data).lastTaskCreation).toBe(localNoon(friday));
    // Only today's task is new; Tuesday to Thursday get none.
    expect(data.task.ids).toEqual([`rpt_c_${friday}`, TASK]);
    importable(data, friday, paused);
  });

  it('moves the cursor to yesterday when today is no occurrence', () => {
    const paused = setPaused(habit({ type: 'weekdays', days: ['mon'] }), 'c', true, MONDAY);
    const data = setPaused(paused, 'c', false, '2026-03-06');
    expect(cfgOf(data)).toMatchObject({
      isPaused: false,
      lastTaskCreationDay: '2026-03-05',
      lastTaskCreation: localNoon('2026-03-05'),
    });
    expect(data.task).toBe(paused.task);
    importable(data, '2026-03-06', paused);
  });

  it('never moves the cursor back', () => {
    const paused = setPaused(habit(), 'c', true, MONDAY);
    const data = setPaused(paused, 'c', false, MONDAY);
    expect(cfgOf(data)).toEqual({ ...cfgOf(habit()), isPaused: false });
    expect(data.task).toBe(paused.task);
  });
});

describe('changing the schedule', () => {
  it('writes only the fields that differ', () => {
    const before = habit();
    const data = setSchedule(
      setDone(before, TASK, true, NOW),
      'c',
      { type: 'everyNDays', n: 2 },
      MONDAY,
    );
    expect(cfgOf(data)).toEqual({
      ...cfgOf(before),
      quickSetting: 'CUSTOM',
      repeatEvery: 2,
    });
    expect(setSchedule(before, 'c', { type: 'daily' }, MONDAY)).toBe(before);
    importable(data, MONDAY);
  });

  it('refuses a schedule a stage may not use', () => {
    const before = habit();
    expect(setSchedule(before, 'c', { type: 'everyNDays', n: 8 }, MONDAY)).toBe(before);
    expect(setSchedule(before, 'c', { type: 'everyNDays', n: 1 }, MONDAY)).toBe(before);
    expect(setSchedule(before, 'c', { type: 'weekdays', days: [] }, MONDAY)).toBe(before);
  });

  it('keeps the open task on today when today is still an occurrence', () => {
    const before = habit();
    const data = setSchedule(before, 'c', { type: 'weekdays', days: ['mon', 'wed'] }, MONDAY);
    expect(cfgOf(data)).toMatchObject({
      quickSetting: 'CUSTOM',
      repeatCycle: 'WEEKLY',
      repeatEvery: 1,
      monday: true,
      tuesday: false,
      wednesday: true,
      sunday: false,
      startDate: MONDAY,
      skipOverdue: true,
      lastTaskCreationDay: MONDAY,
      lastTaskCreation: localNoon(MONDAY),
    });
    expect(data.task).toStrictEqual(before.task);
    expect(data.tag?.entities[TODAY_ID]?.taskIds).toEqual([TASK]);
    expect(data.planner).toBeUndefined();
    importable(data, MONDAY, before);
    expect(createInstances(data, TUESDAY).task.ids).toEqual([TASK]);
  });

  it('moves the open task to the next occurrence when today is none', () => {
    const before = habit();
    const data = setSchedule(before, 'c', { type: 'weekdays', days: ['wed', 'fri'] }, MONDAY);
    expect(data.task.entities[TASK]).toEqual({ ...before.task.entities[TASK], dueDay: WEDNESDAY });
    expect(data.task.ids).toEqual([TASK]);
    expect(data.tag?.entities[TODAY_ID]?.taskIds).toEqual([]);
    expect(data.planner).toEqual({ days: { [WEDNESDAY]: [TASK] } });
    expect(cfgOf(data)).toMatchObject({
      lastTaskCreationDay: WEDNESDAY,
      lastTaskCreation: localNoon(WEDNESDAY),
    });
    expect(todaysTasks(data, MONDAY)).toEqual([]);
    importable(data, MONDAY, before);
    // On Wednesday the moved task is the day's task; no second one is made.
    const wednesday = createInstances(data, WEDNESDAY);
    expect(wednesday.task.ids).toEqual([TASK]);
    expect(todaysTasks(wednesday, WEDNESDAY).map((task) => task.id)).toEqual([TASK]);
    expect(wednesday.tag?.entities[TODAY_ID]?.taskIds).toEqual([TASK]);
  });

  it('moves an older open task to today and takes it out of its planned day', () => {
    const start: Dataset = { ...habit({ type: 'weekdays', days: ['mon'] }), keptSlice: { a: 1 } };
    const planned: Dataset = {
      ...start,
      planner: {
        days: { [WEDNESDAY]: [TASK], '2026-03-09': [] },
        addPlannedTasksDialogLastShown: MONDAY,
      },
      task: {
        ...start.task,
        entities: {
          [TASK]: { ...taskOf(start), dueDay: WEDNESDAY, remindAt: 5, dueWithTime: 6 },
        },
      },
    } as Dataset;
    const data = setSchedule(planned, 'c', { type: 'daily' }, TUESDAY);
    expect(data.task.entities[TASK]).toEqual({ ...start.task.entities[TASK], dueDay: TUESDAY });
    expect(data.planner).toEqual({
      days: { [WEDNESDAY]: [], '2026-03-09': [] },
      addPlannedTasksDialogLastShown: MONDAY,
    });
    expect(data.tag?.entities[TODAY_ID]?.taskIds).toEqual([TASK]);
    expect(data.keptSlice).toEqual({ a: 1 });
    importable(data, TUESDAY);
  });

  it('makes today’s task when none is open and today became an occurrence', () => {
    const start = habit({ type: 'weekdays', days: ['mon'] });
    const done = setDone(start, TASK, true, NOW);
    const data = setSchedule(done, 'c', { type: 'daily' }, TUESDAY);
    expect(data.task.ids).toEqual([`rpt_c_${TUESDAY}`, TASK]);
    expect(cfgOf(data).lastTaskCreationDay).toBe(TUESDAY);
    importable(data, TUESDAY, done);
    // Today already has its task: nothing more is made.
    const again = setSchedule(data, 'c', { type: 'everyNDays', n: 2 }, TUESDAY);
    expect(again.task.ids).toEqual(data.task.ids);
  });

  it('changes only the config while the repeat is paused', () => {
    const paused = setPaused(habit(), 'c', true, MONDAY);
    const data = setSchedule(paused, 'c', { type: 'weekdays', days: ['fri'] }, MONDAY);
    expect(data.task).toBe(paused.task);
    expect(data.tag).toBe(paused.tag);
    expect(cfgOf(data)).toMatchObject({ isPaused: true, friday: true, monday: false });
    expect(cfgOf(data).lastTaskCreation).toBeUndefined();
    importable(data, MONDAY, paused);
  });

  it('is not offered for a repeat with a start time and a reminder', () => {
    const start = habit();
    const timed: Dataset = {
      ...start,
      taskRepeatCfg: {
        ...start.taskRepeatCfg,
        entities: { c: { ...cfgOf(start), startTime: '9:00', remindAt: 'AtStart' } },
      },
    };
    expect(canChangeSchedule(cfgOf(timed))).toBe(false);
    expect(setSchedule(timed, 'c', { type: 'everyNDays', n: 2 }, MONDAY)).toBe(timed);
  });
});

describe('the journey after these changes', () => {
  const journey = builtInJourneys.find((j) => j.id === 'gentle-morning');
  const stage = journey?.stages[0];
  if (!journey || !stage) throw new Error('no built-in journey');

  const setup = async () => {
    const store = await openStore(memory(), freshDataset);
    let now = new Date(`${MONDAY}T08:00:00Z`);
    let ids = 0;
    const host = createHost({
      store,
      now: () => now,
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
    registerHooks(host.api, brain.refresh);
    await brain.write({
      ...nameAnchor({ anchorId: 'a1', anchor: { kind: 'routine', words: 'getting up' } }),
      ...startJourney({ runId: 'r', journey, startDay: MONDAY, anchor: { anchorId: 'a1' } }),
    });
    const made = await host.view.createHabit?.({ title: 'Water', schedule: stage.schedule });
    await brain.write(
      bindStage({
        runId: 'r',
        stageId: stage.id,
        taskId: made?.taskId ?? '',
        day: MONDAY,
        ...made,
      }),
    );
    const change = async (next: (data: Dataset) => Dataset, at?: string) => {
      if (at) now = new Date(`${at}T08:00:00Z`);
      await store.update(next);
      host.emit('dataChanged');
      return brain.state();
    };
    return { store, change, taskId: made?.taskId ?? '', cfgId: made?.repeatCfgId ?? '', brain };
  };

  it('counts nothing for won’t do, and the day is open, not blamed', async () => {
    const { change, taskId, brain } = await setup();
    const state = await change((data) => wontDo(data, taskId, NOW));
    const station = state.view.active?.stations[0];
    expect(station?.completions).toBe(0);
    expect(station?.lastDays?.at(-1)).toEqual({ day: MONDAY, mark: 'open' });
    brain.stop();
  });

  it('writes the journey’s pause record when the repeat is paused, and resumes it', async () => {
    const { change, cfgId, brain } = await setup();
    const paused = await change((data) => setPaused(data, cfgId, true, TUESDAY), TUESDAY);
    expect(paused.records[`pause:r:${TUESDAY}`]).toMatchObject({ action: 'pause' });
    const resumed = await change(
      (data) => setPaused(data, cfgId, false, '2026-03-06'),
      '2026-03-06',
    );
    expect(resumed.records['pause:r:2026-03-06']).toMatchObject({ action: 'resume' });
    // The days of the pause are paused days, never gaps.
    const days = resumed.view.active?.stations[0]?.lastDays ?? [];
    const during = days.filter((d) => d.day >= TUESDAY && d.day < '2026-03-06');
    expect(during.map((d) => d.mark)).toEqual(['paused', 'paused', 'paused']);
    brain.stop();
  });

  it('does not count a left-out day as due', async () => {
    const { change, cfgId, brain } = await setup();
    await change((data) => leaveOut(data, cfgId, TUESDAY, MONDAY));
    const state = await change((data) => createInstances(data, '2026-03-06'), '2026-03-06');
    const days = state.view.active?.stations[0]?.lastDays?.map((d) => d.day) ?? [];
    expect(days).toContain(WEDNESDAY);
    expect(days).not.toContain(TUESDAY);
    brain.stop();
  });

  it('keeps the stage followed after a schedule change', async () => {
    const { change, cfgId, brain } = await setup();
    const state = await change((data) =>
      setSchedule(data, cfgId, { type: 'weekdays', days: ['mon', 'wed', 'fri'] }, MONDAY),
    );
    expect(state.view.active?.stations[0]?.state).toBe('current');
    brain.stop();
  });
});
