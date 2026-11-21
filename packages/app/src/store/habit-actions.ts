import { isScheduled, isSupported, toRepeatCfg, type Schedule } from '@questarc/engine';

import type { Dataset, StoredRepeatCfg, StoredTask } from './dataset';
import { TODAY_ID } from './dataset';
import { addDays, createInstances, localNoon } from './instances';

/**
 * What the user can do to a habit besides ticking it off (#166): finish
 * today's task as "won't do", leave out a coming occurrence, pause and
 * resume the repeat, change its schedule. Each writes what Super
 * Productivity writes for the same action and nothing else
 * (docs/super-productivity-facts.md §5, "What the user's actions on a
 * recurring task write"; facts from its source at
 * v20.0.0, commit 4db0e112, MIT, © Johannes Millan; no code copied).
 * No task is deleted and none is reopened except by undoing "won't do";
 * no repeat is ended. Fields are removed, never set to null.
 */

type Fields = Record<string, unknown>;

const withCfg = (data: Dataset, cfg: StoredRepeatCfg): Dataset => ({
  ...data,
  taskRepeatCfg: {
    ...data.taskRepeatCfg,
    entities: { ...data.taskRepeatCfg.entities, [cfg.id]: cfg },
  },
});

const withTasks = (data: Dataset, tasks: readonly StoredTask[]): Dataset => ({
  ...data,
  task: {
    ...data.task,
    entities: { ...data.task.entities, ...Object.fromEntries(tasks.map((t) => [t.id, t])) },
  },
});

/** Finished as "won't do": done, with `wontDoOn` equal to `doneOn`. */
export const isWontDo = (task: StoredTask): boolean =>
  task.isDone && task.wontDoOn != null && task.wontDoOn === task.doneOn;

/**
 * Finishes an open task as "won't do": `isDone`, and `doneOn` and
 * `wontDoOn` both `now`. The engine does not count it (game rules §1).
 * Opening it again is `setDone(…, false)`, as in Super Productivity:
 * `doneOn` goes and `wontDoOn` stays behind, which no longer matches.
 */
export const wontDo = (data: Dataset, taskId: string, now: number): Dataset => {
  const task = data.task.entities[taskId];
  if (!task || task.isDone) return data;
  return withTasks(data, [{ ...task, isDone: true, doneOn: now, wontDoOn: now }]);
};

/** Whether the app can show and change this repeat: one of the three schedules. */
export const isHabit = (cfg: StoredRepeatCfg): boolean => isSupported(toRepeatCfg(cfg));

const LOOK_AHEAD_DAYS = 31;

/** The first day from `from` on that the pattern has; an end date leaves none after it. */
const occurrenceFrom = (cfg: StoredRepeatCfg, from: string): string | undefined => {
  const schedule = toRepeatCfg(cfg);
  for (let n = 0; n < LOOK_AHEAD_DAYS; n += 1) {
    const day = addDays(from, n);
    if (isScheduled(schedule, day)) return day;
  }
  return undefined;
};

/**
 * The next occurrence after today that the user has not left out: the
 * one "Leave Out" is about. Super Productivity offers this for coming
 * occurrences only, never for today or the past.
 */
export const nextOccurrence = (cfg: StoredRepeatCfg, today: string): string | undefined => {
  if (!isHabit(cfg)) return undefined;
  const schedule = toRepeatCfg(cfg);
  for (let n = 1; n <= LOOK_AHEAD_DAYS; n += 1) {
    const day = addDays(today, n);
    if (isScheduled(schedule, day) && !cfg.deletedInstanceDates?.includes(day)) return day;
  }
  return undefined;
};

/** The coming occurrences the user left out, soonest first. */
export const leftOut = (cfg: StoredRepeatCfg, today: string): string[] =>
  (cfg.deletedInstanceDates ?? []).filter((day) => day > today).sort();

/**
 * Leaves out a coming occurrence: its date joins the config's
 * `deletedInstanceDates`, so no task is made for it and the day is not
 * due (game rules §2: a planned skip, not a miss). Today and past days
 * are refused: there Super Productivity offers "won't do" instead.
 */
export const leaveOut = (data: Dataset, cfgId: string, day: string, today: string): Dataset => {
  const cfg = data.taskRepeatCfg.entities[cfgId];
  const dates = cfg?.deletedInstanceDates ?? [];
  if (!cfg || day <= today || dates.includes(day)) return data;
  return withCfg(data, { ...cfg, deletedInstanceDates: [...dates, day] });
};

/** Takes a left-out occurrence back, while it is still to come: its date leaves the list. */
export const takeBack = (data: Dataset, cfgId: string, day: string, today: string): Dataset => {
  const cfg = data.taskRepeatCfg.entities[cfgId];
  const dates = cfg?.deletedInstanceDates ?? [];
  if (!cfg || day <= today || !dates.includes(day)) return data;
  const next: StoredRepeatCfg & Fields = {
    ...cfg,
    deletedInstanceDates: dates.filter((d) => d !== day),
  };
  return withCfg(data, next);
};

/**
 * Pauses or resumes a repeat. Pausing writes `isPaused` alone: an open
 * task stays where it is. Resuming also moves the creation cursor to
 * yesterday when it is older (`lastTaskCreationDay`, and
 * `lastTaskCreation` at noon), so the days of the pause are not made up
 * for, and today's task is made if today is an occurrence. The adapter
 * sees the change and writes the journey's pause record (game rules §2).
 */
export const setPaused = (
  data: Dataset,
  cfgId: string,
  paused: boolean,
  today: string,
): Dataset => {
  const cfg = data.taskRepeatCfg.entities[cfgId];
  if (!cfg || (cfg.isPaused === true) === paused) return data;
  if (paused) return withCfg(data, { ...cfg, isPaused: true });
  const yesterday = addDays(today, -1);
  const cursor =
    cfg.lastTaskCreationDay && cfg.lastTaskCreationDay >= yesterday
      ? {}
      : { lastTaskCreationDay: yesterday, lastTaskCreation: localNoon(yesterday) };
  return createInstances(withCfg(data, { ...cfg, isPaused: false, ...cursor }), today);
};

const WEEKDAYS = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
} as const;

/**
 * The fields a schedule differs in from what the config has, as Super
 * Productivity's dialog sends only what changed: the cycle, the step
 * and `quickSetting` (`DAILY` for every day, `CUSTOM` otherwise); the
 * weekday flags only for chosen weekdays. `startDate`, `skipOverdue`
 * and everything else stay.
 */
const scheduleChanges = (cfg: StoredRepeatCfg, schedule: Schedule): Fields => {
  const wanted: Fields = {
    quickSetting: schedule.type === 'daily' ? 'DAILY' : 'CUSTOM',
    repeatCycle: schedule.type === 'weekdays' ? 'WEEKLY' : 'DAILY',
    repeatEvery: schedule.type === 'everyNDays' ? schedule.n : 1,
    ...(schedule.type === 'weekdays'
      ? Object.fromEntries(
          Object.entries(WEEKDAYS).map(([short, name]) => [
            name,
            schedule.days.includes(short as keyof typeof WEEKDAYS),
          ]),
        )
      : {}),
  };
  return Object.fromEntries(Object.entries(wanted).filter(([key, value]) => cfg[key] !== value));
};

/** Whether the schedule is one a stage may use (game rules §2). */
export const isValidSchedule = (schedule: Schedule): boolean =>
  schedule.type === 'daily' ||
  (schedule.type === 'everyNDays' &&
    Number.isInteger(schedule.n) &&
    schedule.n >= 2 &&
    schedule.n <= 7) ||
  (schedule.type === 'weekdays' && schedule.days.length > 0);

/**
 * A repeat with a start time and a reminder schedules its tasks with a
 * time; changing its schedule would have to move that time too, which
 * the app does not do. Such a config (only from an imported backup)
 * keeps its schedule here.
 */
export const canChangeSchedule = (cfg: StoredRepeatCfg): boolean =>
  isHabit(cfg) && !(cfg.startTime && cfg.remindAt);

/**
 * Changes a repeat's schedule to one of the three a stage may use, and
 * does to the open task what Super Productivity does after such an
 * edit (not while the repeat is paused):
 *
 * - With an open task of the repeat, the newest one moves to the next
 *   occurrence on or after today: its `dueDay`, the Today tag's list
 *   (at the end for today, out of it for a later day) and, for a later
 *   day, the planner's list of that day; the cursor
 *   (`lastTaskCreationDay`, `lastTaskCreation` at noon) is that day, so
 *   no second task is made for it. Without such an occurrence (an end
 *   date has passed) the task stays.
 * - Without an open task, today's task is made if today is an
 *   occurrence that was not handled yet.
 *
 * Due days of the past follow the new schedule (docs/decisions/marker-progress.md).
 */
export const setSchedule = (
  data: Dataset,
  cfgId: string,
  schedule: Schedule,
  today: string,
): Dataset => {
  const before = data.taskRepeatCfg.entities[cfgId];
  if (!before || !canChangeSchedule(before) || !isValidSchedule(schedule)) return data;
  const changes = scheduleChanges(before, schedule);
  if (Object.keys(changes).length === 0) return data;
  const cfg: StoredRepeatCfg = { ...before, ...changes };
  const changed = withCfg(data, cfg);
  if (cfg.isPaused) return changed;

  const open = data.task.ids
    .map((id) => data.task.entities[id])
    .filter((task): task is StoredTask => task?.repeatCfgId === cfgId && !task.isDone);
  const day = occurrenceFrom(cfg, today);
  if (open.length === 0) {
    const handled = cfg.lastTaskCreationDay !== undefined && cfg.lastTaskCreationDay >= today;
    return !handled && day === today ? createInstances(changed, today) : changed;
  }
  if (!day) return changed;

  const task = open.reduce((a, b) => (a.created > b.created ? a : b));
  const moved: StoredTask & Fields = { ...task, dueDay: day };
  delete moved.dueWithTime;
  delete moved.remindAt;
  let next = withTasks(
    withCfg(changed, { ...cfg, lastTaskCreationDay: day, lastTaskCreation: localNoon(day) }),
    [moved],
  );

  const tag = next.tag?.entities[TODAY_ID];
  if (next.tag && tag && (day === today || tag.taskIds.includes(task.id))) {
    const others = tag.taskIds.filter((id) => id !== task.id);
    const taskIds = day === today ? [...others, task.id] : others;
    next = {
      ...next,
      tag: { ...next.tag, entities: { ...next.tag.entities, [TODAY_ID]: { ...tag, taskIds } } },
    };
  }

  const planner = next.planner as { days?: Record<string, readonly string[]> } | undefined;
  const listed = Object.values(planner?.days ?? {}).some((ids) => ids.includes(task.id));
  if (listed || day !== today) {
    const days = Object.fromEntries(
      Object.entries(planner?.days ?? {}).map(([d, ids]) => [
        d,
        ids.includes(task.id) ? ids.filter((id) => id !== task.id) : ids,
      ]),
    );
    if (day !== today) days[day] = [...(days[day] ?? []), task.id];
    next = { ...next, planner: { ...planner, days } };
  }
  return next;
};
