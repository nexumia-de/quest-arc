import type { RunView } from '@questarc/engine';
import { capitalise } from '@questarc/ui/shared/plan';
import type { State } from '@questarc/ui/shared/protocol';
import { stageAction } from '@questarc/ui/shared/texts';
import { anchorTitle } from '@questarc/ui/ui/journey/moment';

import type { StoredTask } from '../store/dataset';

/**
 * Today by moments as data (#164, docs/behaviour.md "Today"): today's
 * tasks under the moment their journey starts from, in the order of the
 * day the engine's `valley` view gives. Nothing is computed about the
 * game here: which step grows and which runs by itself is read from the
 * view. No DOM, so it runs in Node's tests.
 */

export interface TodayRow {
  readonly task: StoredTask;
  /** The task of the one growing step. */
  readonly growing: boolean;
}

export interface TodayMoment {
  /** The moment's anchor; absent for the tasks that stand at no moment. */
  readonly anchorId?: string;
  /** The moment in words: the user's name for it, else "After getting up" or "At 21:30". */
  readonly title?: string;
  readonly rows: readonly TodayRow[];
  /** The steps that run by itself here, in words: shown in a line, never ticked. */
  readonly byItself: readonly string[];
}

type Game = Pick<State, 'view' | 'journeys' | 'records'>;
type Binding = { taskId?: string; repeatCfgId?: string } | undefined;

interface Bound {
  readonly anchorId?: string;
  readonly kind: 'growing' | 'followed' | 'by-itself';
}

/**
 * What each bound repeat config is in the game. A config bound to
 * several stages is the growing step first, then a followed one, and
 * runs by itself only when nothing else follows it.
 */
const boundConfigs = (
  { view, records }: Game,
  cfgOfTask: ReadonlyMap<string, string>,
): Map<string, Bound> => {
  const found = new Map<string, Bound>();
  const rank = { 'by-itself': 0, followed: 1, growing: 2 };
  const put = (run: RunView, stageId: string, kind: Bound['kind']) => {
    const binding = records[`binding:${run.runId}:${stageId}`] as Binding;
    // A binding written before its task repeated names no config: the
    // bound task's own is used, as the engine does.
    const cfgId = binding?.repeatCfgId ?? cfgOfTask.get(binding?.taskId ?? '');
    if (!cfgId) return;
    const before = found.get(cfgId);
    if (before && rank[before.kind] >= rank[kind]) return;
    found.set(cfgId, { kind, ...(run.anchor ? { anchorId: run.anchor.id } : {}) });
  };
  const runs = [...view.finished, ...view.paused, ...(view.active ? [view.active] : [])];
  for (const run of runs) {
    const current = run === view.active ? run.stations[run.position.stage]?.stageId : undefined;
    const graduated = run.habit?.state === 'graduated' ? run.habit.stageId : undefined;
    for (const { stageId } of run.stations)
      put(
        run,
        stageId,
        stageId === current ? 'growing' : stageId === graduated ? 'by-itself' : 'followed',
      );
  }
  return found;
};

const plain = (task: StoredTask): TodayRow => ({ task, growing: false });

/**
 * Today's tasks grouped by moment. Moments come in the order of the day
 * and only when something stands under them today; tasks that belong to
 * no moment (a journey from before moments, a recurring task without a
 * journey) follow in one last group without a title. The task of a step
 * that runs by itself is left out: it stands in a line and is not ticked
 * (design rule 25). Without a game state every task is in that last group.
 */
export const todayMoments = (
  tasks: readonly StoredTask[],
  game: Game | undefined,
  allTasks: readonly StoredTask[] = tasks,
): TodayMoment[] => {
  if (!game) return tasks.length > 0 ? [{ rows: tasks.map(plain), byItself: [] }] : [];
  const cfgOfTask = new Map(
    allTasks.flatMap((task) => (task.repeatCfgId ? [[task.id, task.repeatCfgId] as const] : [])),
  );
  const bound = boundConfigs(game, cfgOfTask);
  const places = new Set(game.view.valley.map((place) => place.anchorId));
  const rest: TodayRow[] = [];
  const at = new Map<string, TodayRow[]>();
  for (const task of tasks) {
    const found = bound.get(task.repeatCfgId ?? '');
    if (found?.kind === 'by-itself') continue;
    const row = { task, growing: found?.kind === 'growing' };
    if (found?.anchorId !== undefined && places.has(found.anchorId))
      at.set(found.anchorId, [...(at.get(found.anchorId) ?? []), row]);
    else rest.push(row);
  }
  const moments = game.view.valley.flatMap((place): TodayMoment[] => {
    const anchor = game.view.anchors.find((a) => a.id === place.anchorId);
    const rows = [...(at.get(place.anchorId) ?? [])].sort(
      (a, b) => Number(b.growing) - Number(a.growing),
    );
    const byItself = (anchor?.steps ?? []).flatMap((step) => {
      const action = step.state === 'graduated' && stageAction(step.journeyId, step.stageId);
      return action ? [capitalise(action)] : [];
    });
    if (rows.length === 0 && byItself.length === 0) return [];
    return [
      {
        anchorId: place.anchorId,
        title: anchor ? anchorTitle(anchor, game.journeys) : place.name,
        rows,
        byItself,
      },
    ];
  });
  return rest.length > 0 ? [...moments, { rows: rest, byItself: [] }] : moments;
};
