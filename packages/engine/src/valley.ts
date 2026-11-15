import type { Choices } from './choices';
import { LADDERS } from './ladders';
import { DAYPARTS, type Journey } from './types/journey';
import type { AnchorView, RunView, ValleyPlace, ValleyThing } from './types/view';

/**
 * The Valley (docs/game-rules.md §8, issue #114): the user's anchors as
 * places along the path of a day, each with the things its
 * journeys build. Derived every time from what the engine has computed
 * and the `place` records; nothing is counted or stored here.
 */

/**
 * How many things a place holds: the first journey started from the anchor
 * and the next two build one each; a fourth and later journey builds none
 * (game rules §8; the owner may raise the limit later).
 */
export const THINGS_PER_PLACE = 3;

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

    // Every journey here builds its own thing on the place's ladder (the
    // first journey's), up to the limit, in the order they started.
    const habits = anchor.steps.map((step) => step.state);
    const things: ValleyThing[] = candidate.runs
      .slice(0, THINGS_PER_PLACE)
      .map(({ run, state }) => ({
        runId: run.runId,
        journeyId: run.journeyId,
        state,
        ladder: run.build.ladder,
        version: run.build.version,
        skipped: run.build.skipped,
        versions: run.build.versions,
        marker: run.build.marker,
        markerProgress: run.build.markerProgress,
        ready: run.build.ready,
      }));
    const unbuilt = candidate.runs
      .slice(THINGS_PER_PLACE)
      .map(({ run, state }) => ({ runId: run.runId, journeyId: run.journeyId, state }));
    const name = anchor.name ?? anchor.words ?? anchor.time ?? '';
    places.push({
      anchorId: anchor.id,
      name,
      side: picked.side ?? (index % 2 === 0 ? 'right' : 'left'),
      hue: hue ?? '',
      things,
      unbuilt,
      ...(habits.includes('maintained')
        ? { sign: 'flowers' as const }
        : habits.includes('graduated')
          ? { sign: 'lantern' as const }
          : {}),
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
