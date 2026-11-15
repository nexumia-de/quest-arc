import { LADDERS, type LadderList } from './ladders';
import type { BuildView, RunView } from './types/view';

/**
 * The ladder of a place's things (docs/game-rules.md §8, issue #148):
 * every journey started from an anchor builds its own thing, on the ladder
 * of the first journey started there. Nothing else of a build changes:
 * version, marker progress and ready are the journey's own (§7).
 */

/**
 * The build of every run that stands at an anchor but is not its first
 * journey, with the place's ladder, by run id. The first journey's build
 * and the build of runs without an anchor id stay as `buildRun` computed
 * them.
 */
export const placeBuilds = (
  runs: readonly RunView[],
  /** The marker a run hangs on the place's ladder (its own choice, else the ladder's). */
  markerOf: (run: RunView, ladder: string) => string,
  ladders: LadderList = LADDERS,
): Map<string, BuildView> => {
  const groups = new Map<string, RunView[]>();
  for (const run of runs) {
    const id = run.anchor?.id;
    if (id !== undefined) groups.set(id, [...(groups.get(id) ?? []), run]);
  }

  const result = new Map<string, BuildView>();
  for (const group of groups.values()) {
    const [first, ...further] = [...group].sort(
      (a, b) => a.startDay.localeCompare(b.startDay) || a.runId.localeCompare(b.runId),
    );
    if (!first) continue;
    const ladder = first.build.ladder;
    const own = Object.prototype.hasOwnProperty.call(ladders.ladders, ladder)
      ? ladders.ladders[ladder]
      : undefined;
    for (const run of further) {
      result.set(run.runId, {
        ...run.build,
        ladder,
        marker: markerOf(run, ladder),
        hue: own?.hue ?? run.build.hue,
      });
    }
  }
  return result;
};
