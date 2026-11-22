import { journeyProblems, type Problem } from './content-check';
import type { Journey } from './types/journey';
import type { GameView } from './types/view';
import { journeyErrors } from './validate';

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
 * The most a record may hold: Super Productivity takes 256 KB of
 * uncompressed data per plugin-data entity
 * (docs/super-productivity-facts.md, plugin data).
 */
export const JOURNEY_RECORD_LIMIT = 256 * 1024;

/** The length of a string in UTF-8 bytes, without a host's TextEncoder. */
const utf8Bytes = (text: string): number => {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
};

/**
 * Keep a journey file as the user's own. `builtIn` are the ids of the
 * host's built-in journeys. With `view`, a journey of the user's own
 * that a run walks or walked is not replaced, so what was walked stays
 * as it was. Warnings are for showing, never blocking.
 */
export const keepJourney = (input: {
  readonly journey: unknown;
  readonly builtIn: readonly string[];
  readonly view?: GameView;
}): KeptJourney => {
  const problems = [...journeyProblems(input.journey)];
  const id = idOf(input.journey);
  if (id !== undefined && input.builtIn.includes(id))
    problems.unshift({
      level: 'error',
      at: 'id',
      message: `"${id}" is a built-in journey; a journey of your own needs another id`,
    });
  else if (id !== undefined && input.view !== undefined && journeyInUse(input.view, id))
    problems.unshift({
      level: 'error',
      at: 'id',
      message: `"${id}" is a journey you walk or walked; a changed copy needs another id`,
    });
  const bytes = utf8Bytes(JSON.stringify(input.journey) ?? '');
  if (bytes > JOURNEY_RECORD_LIMIT)
    problems.unshift({
      level: 'error',
      at: '',
      message: `the journey takes ${bytes} bytes; a journey of your own may take ${JOURNEY_RECORD_LIMIT}`,
    });
  const blocked = id === undefined || problems.some((p) => p.level === 'error');
  return { changes: blocked ? {} : { [`journey:${id}`]: input.journey as Journey }, problems };
};

/**
 * The journeys of the user's own among the records, as the engine reads
 * them: valid, holding the id their key names, not taking a built-in
 * journey's id, sorted by id. Hosts list them after their built-in
 * journeys.
 */
export const ownJourneys = (
  records: Readonly<Record<string, unknown>>,
  builtIn: readonly string[],
): Journey[] =>
  Object.entries(records)
    .filter(([key, value]) => {
      const [kind, id, ...rest] = key.split(':');
      return (
        kind === 'journey' &&
        rest.length === 0 &&
        id !== undefined &&
        idOf(value) === id &&
        !builtIn.includes(id) &&
        journeyErrors(value).length === 0
      );
    })
    .map(([, value]) => value as Journey)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

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
