import type { State } from '../../shared/protocol';

/**
 * Whether a journey of the state is the user's own (#40, #89): every
 * journey that is not built in. A state without the list of built-in
 * ones (an older plugin.js) has none of the user's own.
 */
export const isOwnJourney = (state: State, journeyId: string): boolean =>
  state.builtIn !== undefined &&
  !state.builtIn.includes(journeyId) &&
  state.journeys.some((journey) => journey.id === journeyId);

/** The name a journey's export gets: its id, as a file in content/journeys/ would. */
export const exportName = (journeyId: string): string => `${journeyId}.json`;

/** The journey file of an export: the record as it is, readable. */
export const exportText = (journey: unknown): string => `${JSON.stringify(journey, null, 2)}\n`;
