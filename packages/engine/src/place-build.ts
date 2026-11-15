import { LADDERS, type LadderList } from './ladders';
import type { BuildView, RunView } from './types/view';

/**
 * The thing of a place (docs/game-rules.md §8, issue #148). A moment is
 * one routine and one thing stands for it, however many journeys the
 * user starts from it: the thing's ladder is the one of the first
 * journey started there, and its version counts the finished and the
 * skipped stations of every journey there, in the order they were
 * finished, up to the ladder's last version. Derived every time; the
 * count of versions is read from the ladder, no number is fixed here.
 */

interface Event {
  readonly day: string;
  readonly startDay: string;
  readonly runId: string;
  readonly index: number;
  readonly skipped: boolean;
}

/**
 * The build of every run that stands at an anchor, as the place's thing
 * shows it, by run id. Runs without an anchor id are not in the result:
 * their build stays what `buildRun` computed (game rules §7).
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
    // The first journey started here gives the thing its ladder.
    const ordered = [...group].sort(
      (a, b) => a.startDay.localeCompare(b.startDay) || a.runId.localeCompare(b.runId),
    );
    const [first] = ordered;
    if (!first) continue;
    const ladder = first.build.ladder;
    const own = Object.prototype.hasOwnProperty.call(ladders.ladders, ladder)
      ? ladders.ladders[ladder]
      : undefined;
    const last = own?.versions ?? Number.MAX_SAFE_INTEGER;

    // Every finished and skipped station, in the order they were finished
    // (a finished stage that is walked again counts once, as in §7).
    const events: Event[] = ordered
      .flatMap((run) =>
        run.stations.flatMap((station, index): Event[] => {
          const skipped = station.state === 'skipped';
          const day = skipped ? station.skippedDay : station.doneDay;
          return skipped || station.doneDay !== undefined
            ? [{ day: day ?? '', startDay: run.startDay, runId: run.runId, index, skipped }]
            : [];
        }),
      )
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) ||
          a.startDay.localeCompare(b.startDay) ||
          a.runId.localeCompare(b.runId) ||
          a.index - b.index,
      );
    // The k-th finished station (counting from 0) is version k + 2.
    const versionOf = new Map(events.map((e, k) => [`${e.runId}:${e.index}`, k + 2]));
    const standing = Math.min(last, 1 + events.length);

    for (const run of ordered) {
      const mine = events.filter((e) => e.runId === run.runId);
      const versions = mine.map((e) => versionOf.get(`${e.runId}:${e.index}`) ?? 0);
      // The version the journey started from; a journey that finished
      // nothing yet starts from the one standing.
      const from = versions.length > 0 ? (versions[0] ?? 2) - 1 : 1 + events.length;
      const added = versions.filter((v) => v <= last);
      result.set(run.runId, {
        ladder,
        version: standing,
        skipped: mine.flatMap((e, i) =>
          e.skipped && (versions[i] ?? 0) <= last ? [versions[i] ?? 0] : [],
        ),
        from: Math.min(last, from),
        added,
        versions: Math.min(last, from + run.stations.length),
        marker: markerOf(run, ladder),
        hue: own?.hue ?? run.build.hue,
        markerProgress: run.build.markerProgress,
        ready: run.build.ready,
      });
    }
  }
  return result;
};
