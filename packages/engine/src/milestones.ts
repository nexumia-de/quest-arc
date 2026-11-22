import { addDays } from './days';

/**
 * Milestones (docs/game-rules.md §10, issue #87): the 10th, 25th, 50th …
 * time a step was done. They are records of what happened, never a list
 * to complete: a host says the one reached this week in a sentence of
 * the weekly look back and keeps no page of them (owner, 2026-11-14).
 */
export const MILESTONE_COUNTS = [10, 25, 50, 100, 250, 500, 1000] as const;

/**
 * The milestone reached in the seven days up to `today` by these days
 * with a counting completion, the highest if several; none otherwise.
 */
export const milestoneThisWeek = (days: ReadonlySet<string>, today: string): number | undefined => {
  const weekStart = addDays(today, -6);
  let before = 0;
  for (const day of days) if (day < weekStart) before += 1;
  const total = days.size;
  let reached: number | undefined;
  for (const count of MILESTONE_COUNTS) if (before < count && count <= total) reached = count;
  return reached;
};
