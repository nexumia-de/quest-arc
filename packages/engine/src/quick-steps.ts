/**
 * The steps the quick journey form proposes between a first and a last
 * amount (docs/story-format.md, the quick journey; issue #89): three to
 * five amounts that grow by about the same factor, rounded to numbers
 * people say ("2, 5, 10, 20"). The user may change them.
 */

const NICE = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 100];

/** Amounts a step may have: whole numbers from 1 to 1000. */
export const QUICK_AMOUNT = { min: 1, max: 1000 } as const;

const whole = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), QUICK_AMOUNT.min), QUICK_AMOUNT.max)
    : QUICK_AMOUNT.min;

/** The number people would say that is nearest to `value` (by factor). */
const nice = (value: number): number => {
  const scale = value > 100 ? 10 ** Math.floor(Math.log10(value) - 1) : 1;
  const scaled = value / scale;
  let best = NICE[0] ?? 1;
  for (const candidate of NICE)
    if (
      // 45 and 90 are said of minutes, not of 450 or 900
      (scale === 1 || candidate % 45 !== 0) &&
      Math.abs(Math.log(candidate / scaled)) < Math.abs(Math.log(best / scaled))
    )
      best = candidate;
  return best * scale;
};

/**
 * Three to five ascending amounts from `first` to `last`, both kept as
 * given. Fewer when there is no room between them; one amount when the
 * two are the same (the habit then stays the same).
 */
export const proposeSteps = (first: unknown, last: unknown): number[] => {
  const from = whole(first);
  const to = Math.max(whole(last), from);
  if (to === from) return [from];
  const factor = to / from;
  const count = Math.min(factor <= 3 ? 3 : factor <= 12 ? 4 : 5, to - from + 1);
  const steps = [from];
  for (let i = 1; i < count - 1; i += 1) {
    const exact = from * factor ** (i / (count - 1));
    const previous = steps[steps.length - 1] ?? from;
    const step = Math.max(nice(exact), previous + 1);
    if (step < to) steps.push(step);
  }
  return [...steps, to];
};
