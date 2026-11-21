import type { Schedule } from '@questarc/engine';
import { findStage, planSentence } from '@questarc/ui/shared/plan';
import type { PluginTaskRepeatCfg } from '@super-productivity/plugin-api';
import { weekdayOfId } from '@questarc/ui/ui/journey/format';
import { scheduleOf, scheduleText } from '@questarc/ui/ui/repeat';

import type { Dataset, StoredRepeatCfg } from '../store/dataset';
import {
  canChangeSchedule,
  isHabit,
  leaveOut,
  leftOut,
  nextOccurrence,
  setPaused,
  setSchedule,
  takeBack,
} from '../store/habit-actions';
import type { Store } from '../store/store';
import { at } from '../texts';
import { dayInWords } from './day-words';
import { renderHabit } from './habit';
import { boundConfigs, type Game } from './today-moments';

/**
 * The habit's page on Today (#166): which habit is open, the schedule
 * the user is choosing, and what each of its actions writes and says.
 * The page is pushed over Today's list in the same view and goes back
 * to it; a habit that is gone closes it.
 */

export interface HabitPageOptions {
  readonly root: HTMLElement;
  readonly store: Store;
  readonly today: () => string;
  readonly game: () => Game | undefined;
  /** Writes a change to the dataset and tells the adapter. */
  readonly change: (next: (data: Dataset) => Dataset) => Promise<void>;
  readonly message: (text: string, action?: { label: string; run: () => void }) => void;
  /** Draws Today's view again (the list, or this page). */
  readonly redraw: () => void;
}

export interface HabitPage {
  open(cfgId: string): void;
  /** Draws the page if a habit is open; false when Today's list is to be drawn. */
  draw(): boolean;
  /** A habit in a line: "Paused", or its schedule in words. */
  note(cfg: StoredRepeatCfg): string;
}

const scheduleFor = (cfg: StoredRepeatCfg): Schedule | undefined =>
  scheduleOf(cfg as unknown as PluginTaskRepeatCfg);

export const createHabitPage = (options: HabitPageOptions): HabitPage => {
  const { store, today, change, message, redraw } = options;
  let open: string | undefined;
  let draft: Schedule | undefined;

  const close = (): void => {
    open = undefined;
    draft = undefined;
    redraw();
    // Back on the list the keyboard is on the habit's task or line.
    options.root.querySelector<HTMLElement>('[role=checkbox], .app-resting')?.focus();
  };

  /** The plan sentence of the journey's step that uses this habit, in the user's words. */
  const planOf = (cfgId: string): string | undefined => {
    const game = options.game();
    if (!game) return undefined;
    const tasks = Object.values(store.data.task.entities).filter((task) => task !== undefined);
    const bound = boundConfigs(game, tasks).get(cfgId);
    const stage = bound && findStage(game.journeys, bound.run.journeyId, bound.stageId);
    const station = bound?.run.stations.find((each) => each.stageId === bound.stageId);
    return stage ? planSentence(stage, station?.pair, bound?.run.anchor) : undefined;
  };

  return {
    open(cfgId) {
      open = cfgId;
      draft = undefined;
      redraw();
      options.root.querySelector<HTMLElement>('#app-habit-back')?.focus();
    },
    note: (cfg) => {
      const schedule = scheduleFor(cfg);
      return cfg.isPaused
        ? at('habit.paused')
        : schedule
          ? scheduleText(schedule, weekdayOfId)
          : '';
    },
    draw() {
      if (open === undefined) return false;
      const cfgId = open;
      const cfg = store.data.taskRepeatCfg.entities[cfgId];
      const schedule = cfg && isHabit(cfg) ? scheduleFor(cfg) : undefined;
      if (!cfg || !schedule) {
        // Gone with an import: Today's list shows what is there.
        open = undefined;
        draft = undefined;
        return false;
      }
      const plan = planOf(cfgId);
      const next = nextOccurrence(cfg, today());
      renderHabit(options.root, {
        title: cfg.title ?? '',
        ...(plan ? { plan } : {}),
        schedule,
        draft: draft ?? schedule,
        canChange: canChangeSchedule(cfg),
        setDraft: (chosen) => {
          draft = chosen;
          redraw();
        },
        saveSchedule: () => {
          const chosen = draft;
          if (!chosen) return;
          draft = undefined;
          void change((data) => setSchedule(data, cfgId, chosen, today())).then(() =>
            message(at('habit.schedule.saved')),
          );
        },
        paused: cfg.isPaused === true,
        setPaused: (paused) =>
          void change((data) => setPaused(data, cfgId, paused, today())).then(() =>
            message(at(paused ? 'habit.pause.done' : 'habit.resume.done')),
          ),
        ...(next ? { next } : {}),
        leaveOut: (day) =>
          void change((data) => leaveOut(data, cfgId, day, today())).then(() =>
            message(at('habit.leave-out.done', { day: dayInWords(day) }), {
              label: at('data.undo'),
              run: () => void change((data) => takeBack(data, cfgId, day, today())),
            }),
          ),
        leftOut: leftOut(cfg, today()),
        takeBack: (day) => void change((data) => takeBack(data, cfgId, day, today())),
        back: close,
      });
      return true;
    },
  };
};
