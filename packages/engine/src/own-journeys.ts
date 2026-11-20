import { journeyProblems, type Problem } from './content-check';
import type { Journey } from './types/journey';
import type { GameView } from './types/view';

/**
 * The user's own journeys (docs/data-model.md, `journey:<id>`; issues
 * #40 and #89): a journey file the user imported or made with the quick
 * form is kept as one record, checked by the journey checker first. A
 * built-in journey's id is never taken.
 */

export interface KeptJourney {
  /** The record to write; empty when the journey cannot be kept. */
  readonly changes: Record<string, unknown>;
  /** What the journey checker says; an error means nothing is written. */
  readonly problems: readonly Problem[];
}

const idOf = (value: unknown): string | undefined => {
  const id = (value as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? id : undefined;
};

/**
 * Keep a journey file as the user's own. `builtIn` are the ids of the
 * host's built-in journeys. Warnings are for showing, never blocking.
 */
export const keepJourney = (input: {
  readonly journey: unknown;
  readonly builtIn: readonly string[];
}): KeptJourney => {
  const problems = [...journeyProblems(input.journey)];
  const id = idOf(input.journey);
  if (id !== undefined && input.builtIn.includes(id))
    problems.unshift({
      level: 'error',
      at: 'id',
      message: `"${id}" is a built-in journey; a journey of your own needs another id`,
    });
  const blocked = id === undefined || problems.some((p) => p.level === 'error');
  return { changes: blocked ? {} : { [`journey:${id}`]: input.journey as Journey }, problems };
};

/** Whether a run of the view walks or walked this journey. */
export const journeyInUse = (view: GameView, journeyId: string): boolean =>
  [view.active, ...view.paused, ...view.finished, ...view.readOnly].some(
    (run) => run?.journeyId === journeyId,
  );

/**
 * Remove a journey of the user's own. Nothing is written while a run
 * uses it: what was walked stays readable.
 */
export const forgetJourney = (view: GameView, journeyId: string): Record<string, unknown> =>
  journeyInUse(view, journeyId) ? {} : { [`journey:${journeyId}`]: '' };
