import type { PlaceRecord } from './choices';
import { LADDERS, type LadderList } from './ladders';
import type { BuildView, RunView } from './types/view';

/**
 * The ladder of a place's things (docs/game-rules.md §8, issue #148):
 * every journey started from an anchor builds its own thing, on the ladder
 * of the first journey started there, or the kind the user chose for the
 * place (`place:<anchorId>.ladder`, #158). Nothing else of a build changes:
 * version, marker progress and ready are the journey's own (§7), so a
 * changed kind draws the same versions as another thing and loses nothing.
 */

/**
 * The build of every run that stands at an anchor, with the place's
 * ladder, by run id: the user's choice for the place if it is a known
 * ladder, else the first journey's. Only builds that change are listed;
 * the build of runs without an anchor id stays as `buildRun` computed it.
 */
export const placeBuilds = (
  runs: readonly RunView[],
  places: ReadonlyMap<string, PlaceRecord> = new Map(),
  ladders: LadderList = LADDERS,
): Map<string, BuildView> => {
  const groups = new Map<string, RunView[]>();
  for (const run of runs) {
    const id = run.anchor?.id;
    if (id !== undefined) groups.set(id, [...(groups.get(id) ?? []), run]);
  }

  const result = new Map<string, BuildView>();
  for (const group of groups.values()) {
    const [first] = [...group].sort(
      (a, b) => a.startDay.localeCompare(b.startDay) || a.runId.localeCompare(b.runId),
    );
    if (!first) continue;
    const known = (name: string | undefined): name is string =>
      name !== undefined && Object.prototype.hasOwnProperty.call(ladders.ladders, name);
    const chosen = places.get(first.anchor?.id ?? '')?.ladder;
    const ladder = known(chosen) ? chosen : first.build.ladder;
    const own = ladders.ladders[ladder];
    for (const run of group) {
      if (run === first && ladder === first.build.ladder) continue;
      result.set(run.runId, {
        ...run.build,
        ladder,
        hue: own?.hue ?? run.build.hue,
      });
    }
  }
  return result;
};
