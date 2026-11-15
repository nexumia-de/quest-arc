import { LADDERS, type Ladder } from '../src/ladders';

/**
 * Runs `check` while the engine's list has a synthetic ladder `name` with
 * `versions` versions. The ladders in content/art/ have five versions
 * today and more come later; the engine reads the count from the list, so
 * tests use this to prove that nothing in the engine fixes a number.
 */
export const withLadder = <T>(name: string, versions: number, check: () => T): T => {
  const ladders = LADDERS.ladders as Record<string, Ladder>;
  ladders[name] = { versions, water: false, marker: 'flowers', hue: 'moss' };
  try {
    return check();
  } finally {
    Reflect.deleteProperty(ladders, name);
  }
};
