import { LADDERS, type Ladder } from '../src/ladders';

/**
 * Runs `check` while the engine's list has a synthetic ladder on water,
 * `pond`. No ladder of the Valley has water since Crossing was retired
 * (#128), but the engine keeps the rule that a land-only marker never
 * hangs there; tests use this to keep it covered.
 */
export const withWaterLadder = <T>(check: () => T): T => {
  const ladders = LADDERS.ladders as Record<string, Ladder>;
  ladders.pond = { versions: 5, water: true, marker: 'lanterns', hue: 'water' };
  try {
    return check();
  } finally {
    delete ladders.pond;
  }
};
