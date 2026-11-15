import type { Choices } from './choices';
import { LADDERS } from './ladders';
import { DAYPARTS, type Journey } from './types/journey';
import type { AnchorView, RunView, ValleyPlace, ValleyThing } from './types/view';

/**
 * The Valley (docs/game-rules.md §8, issue #114): the user's anchors as
 * places along the path of a day, each with the one thing its first
 * journey builds. Derived every time from what the engine has computed
 * and the `place` records; nothing is counted or stored here.
 */

/** Steps of the surroundings that are drawn (a low hedge, a bench, a tree, a butterfly). */
export const SURROUNDINGS_STEPS = 4;

const NO_RUN = '9999-99-99';

interface Candidate {
  readonly anchor: AnchorView & { readonly id: string };
  /** Every journey that stands here, with how it is doing. */
  readonly runs: readonly { readonly run: RunView; readonly state: ValleyThing['state'] }[];
  /** The earliest start of a journey here. */
  readonly first: string;
  readonly daypart: number;
}

export const valleyView = (
  choices: Choices,
  journeys: ReadonlyMap<string, Journey>,
  anchors: readonly AnchorView[],
  runs: {
    readonly active?: RunView;
    readonly paused: readonly RunView[];
    readonly finished: readonly RunView[];
  },
): ValleyPlace[] => {
  const all: { run: RunView; state: ValleyThing['state'] }[] = [
    ...(runs.active ? [{ run: runs.active, state: 'growing' as const }] : []),
    ...runs.paused.map((run) => ({ run, state: 'paused' as const })),
    ...runs.finished.map((run) => ({
      run,
      state: run.habit ? ('finished' as const) : ('ended' as const),
    })),
  ];

  const candidates: Candidate[] = [];
  for (const anchor of anchors) {
    const id = anchor.id;
    if (id === undefined) continue;
    const here = all
      .filter(({ run }) => run.anchor?.id === id)
      // The first journey started here builds the thing.
      .sort(
        (a, b) =>
          a.run.startDay.localeCompare(b.run.startDay) || a.run.runId.localeCompare(b.run.runId),
      );
    const hint = here[0] && journeys.get(here[0].run.journeyId)?.anchor?.daypart;
    const part = hint === undefined ? -1 : DAYPARTS.indexOf(hint);
    candidates.push({
      anchor: { ...anchor, id },
      runs: here,
      first: here[0]?.run.startDay ?? NO_RUN,
      daypart: part < 0 ? DAYPARTS.length : part,
    });
  }

  // The default order of the day: by the kind of moment, then those
  // without one, by first start day and id.
  const byDefault = [...candidates].sort(
    (a, b) =>
      a.daypart - b.daypart ||
      a.first.localeCompare(b.first) ||
      a.anchor.id.localeCompare(b.anchor.id),
  );
  // The user's order: places they placed come first, by position.
  const placed = byDefault
    .filter((c) => choices.places.get(c.anchor.id)?.position !== undefined)
    .sort(
      (a, b) =>
        (choices.places.get(a.anchor.id)?.position ?? 0) -
          (choices.places.get(b.anchor.id)?.position ?? 0) ||
        a.anchor.id.localeCompare(b.anchor.id),
    );
  const loose = byDefault.filter((c) => !placed.includes(c));
  const order = [...placed, ...loose];

  const hues = LADDERS.hues;
  const chosenHue = (id: string): string | undefined => {
    const hue = choices.places.get(id)?.hue;
    return hue !== undefined && hues.includes(hue) ? hue : undefined;
  };

  const places: ValleyPlace[] = [];
  order.forEach((candidate, index) => {
    const { anchor } = candidate;
    const picked = choices.places.get(anchor.id) ?? {};
    const previous = places[index - 1]?.hue;
    const next = order[index + 1] && chosenHue(order[index + 1]?.anchor.id ?? '');
    let hue = chosenHue(anchor.id);
    if (hue === undefined && hues.length > 0) {
      // By position in the day; a neighbour's hue is skipped.
      for (let step = 0; step < hues.length; step++) {
        const candidateHue = hues[(index + step) % hues.length] ?? '';
        hue = candidateHue;
        if (candidateHue !== previous && candidateHue !== next) break;
      }
    }

    const [first, ...further] = candidate.runs;
    const habits = anchor.steps.map((step) => step.state);
    const thing: ValleyThing | undefined = first && {
      runId: first.run.runId,
      journeyId: first.run.journeyId,
      state: first.state,
      ladder: first.run.build.ladder,
      version: first.run.build.version,
      skipped: first.run.build.skipped,
      versions: first.run.build.versions,
      marker: first.run.build.marker,
      markerProgress: first.run.build.markerProgress,
      ready: first.run.build.ready,
    };
    const name = anchor.name ?? anchor.words ?? anchor.time ?? '';
    places.push({
      anchorId: anchor.id,
      name,
      side: picked.side ?? (index % 2 === 0 ? 'right' : 'left'),
      hue: hue ?? '',
      ...(thing ? { thing } : {}),
      ...(habits.includes('maintained')
        ? { sign: 'flowers' as const }
        : habits.includes('graduated')
          ? { sign: 'lantern' as const }
          : {}),
      // A further journey adds the steps it has finished or skipped; they stay
      // whether it waits or was ended early.
      surroundings: Math.min(
        SURROUNDINGS_STEPS,
        further.reduce((sum, { run }) => sum + run.build.version - 1, 0),
      ),
      growing: anchor.state === 'growing',
      chosen: {
        ...(picked.position !== undefined ? { position: picked.position } : {}),
        ...(picked.side !== undefined ? { side: picked.side } : {}),
        ...(picked.hue !== undefined ? { hue: picked.hue } : {}),
      },
    });
  });
  return places;
};
