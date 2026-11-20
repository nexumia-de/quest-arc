import { journeyProblems, type Problem } from './content-check';
import { LADDERS } from './ladders';
import { QUICK_AMOUNT } from './quick-steps';
import { FALLBACK_LANGUAGE, PLAN_FORM, type TextTable } from './texts';
import { DAYPARTS, type Daypart, type Journey, type Schedule, type Stage } from './types/journey';
import { PLAN_FORM_LANGUAGES } from './wording';

/**
 * The quick journey (docs/story-format.md, the quick journey; issue
 * #89): a journey file built from the answers of a short form, so that
 * every host writes the same file for the same answers. The user's
 * words stand as they are; the sentences around them come from the
 * app's texts (`ui.quick.…` in content/i18n), which the host passes in
 * the user's language, because the engine holds no texts.
 */

export const QUICK_MEASURES = ['minutes', 'pages', 'times', 'same'] as const;
export type QuickMeasure = (typeof QUICK_MEASURES)[number];

/** Longest answers, so every built text keeps the checker's limits. */
export const QUICK_LIMITS = { name: 40, action: 80, anchor: 40 } as const;

/** Most steps a quick journey has; the texts of content/i18n reach this far. */
export const QUICK_MAX_STEPS = 6;

/** Ids of quick journeys start with this, so they never take a built-in journey's id. */
export const OWN_PREFIX = 'own-';

export interface QuickAnswers {
  /** The language the user answered in ("de"); its texts are passed as `texts`. */
  readonly language: string;
  /** What the journey is called. */
  readonly name: string;
  /** The action in the user's words: after "I will" in English, the infinitive in German. */
  readonly action: string;
  /** The moment in the user's words: after "After" in English, in the dative after "Nach" in German. */
  readonly anchor: string;
  readonly measure: QuickMeasure;
  /** The amount of each step, growing; ignored for `same`. */
  readonly steps?: readonly number[];
  readonly schedule: Schedule;
  /** A ladder of content/art; the default ladder when missing or unknown. */
  readonly ladder?: string;
  readonly daypart?: Daypart;
  /** Journey ids that exist already (built-in and the user's own). */
  readonly taken?: readonly string[];
}

export interface QuickJourney {
  readonly journey: Journey;
  /** What the journey checker says about it; errors mean it cannot be kept. */
  readonly problems: readonly Problem[];
  /** Text keys of kind hints about the answers, never blocking. */
  readonly hints: readonly string[];
}

/** A first step above this is answered with the hint to start smaller (rule 1). */
const TINY: Readonly<Record<QuickMeasure, number>> = { minutes: 2, pages: 2, times: 2, same: 0 };

const LETTERS: Readonly<Record<string, string>> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

const words = (value: unknown, limit: number): string =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, limit).trim() : '';

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[äöüß]/g, (letter) => LETTERS[letter] ?? '')
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/, '');

const freeId = (name: string, taken: readonly string[]): string => {
  const base = `${OWN_PREFIX}${slug(name) || 'habit'}`;
  let id = base;
  for (let n = 2; taken.includes(id); n += 1) id = `${base}-${n}`;
  return id;
};

const fill = (text: string | undefined, values: Readonly<Record<string, string>>): string =>
  (text ?? '').replace(/\{([a-z]+)\}/g, (_all, name: string) => values[name] ?? '');

const amounts = (answers: QuickAnswers): number[] => {
  if (answers.measure === 'same' || !Array.isArray(answers.steps)) return [];
  const steps: number[] = [];
  for (const value of answers.steps as readonly unknown[]) {
    const previous = steps[steps.length - 1] ?? 0;
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= QUICK_AMOUNT.min &&
      value <= QUICK_AMOUNT.max &&
      value > previous &&
      steps.length < QUICK_MAX_STEPS
    )
      steps.push(value);
  }
  return steps;
};

const scheduleOf = (schedule: unknown): Schedule => {
  const s = (schedule ?? {}) as { type?: unknown; n?: unknown; days?: unknown };
  if (s.type === 'everyNDays' && typeof s.n === 'number') return { type: 'everyNDays', n: s.n };
  if (s.type === 'weekdays' && Array.isArray(s.days))
    return { type: 'weekdays', days: s.days as Extract<Schedule, { type: 'weekdays' }>['days'] };
  return { type: 'daily' };
};

/**
 * The journey for the form's answers. One stage per step; a habit that
 * stays the same, or has one amount only, gets two stages with the same
 * action: getting started (3 of 7 due days) and most days (5 of 7).
 */
export const quickJourney = (answers: QuickAnswers, texts: TextTable): QuickJourney => {
  const t = (key: string): string => (Object.hasOwn(texts, key) ? texts[key] : undefined) ?? '';
  const language = typeof answers.language === 'string' ? answers.language : FALLBACK_LANGUAGE;
  const name = words(answers.name, QUICK_LIMITS.name);
  const action = words(answers.action, QUICK_LIMITS.action);
  const anchor = words(answers.anchor, QUICK_LIMITS.anchor);
  const measure = QUICK_MEASURES.find((m) => m === answers.measure) ?? 'same';
  const id = freeId(name, Array.isArray(answers.taken) ? answers.taken : []);
  const steps = amounts({ ...answers, measure });
  const count = Math.max(steps.length, 2);
  const planForm = PLAN_FORM_LANGUAGES.includes(language);
  const table: Record<string, string> = {
    [`${id}.title`]: name,
    [`${id}.description`]: t('ui.quick.description'),
    [`${id}.why`]: t('ui.quick.why'),
    [`${id}.anchor`]: anchor,
    [`${id}.moment`]: t('ui.quick.moment'),
    [`${id}.ending`]: t('ui.quick.ending'),
  };

  const stages: Stage[] = [];
  for (let i = 0; i < count; i += 1) {
    const amount = steps[Math.min(i, steps.length - 1)];
    const stageId = `step-${i + 1}`;
    const key = `${id}.${stageId}`;
    const step =
      amount === undefined
        ? fill(t('ui.quick.action.same'), { action })
        : fill(t(`ui.quick.action.${measure}.${amount === 1 ? 'one' : 'many'}`), {
            action,
            n: String(amount),
          });
    const last = i === count - 1;
    table[`${key}.action`] = step;
    if (planForm) table[`${key}.action${PLAN_FORM}`] = fill(t('ui.quick.plan-form'), { step });
    table[`${key}.arrival`] = t(
      i === 0 ? 'ui.quick.arrival.first' : last ? 'ui.quick.arrival.last' : `ui.quick.arrival.${i}`,
    );
    if (!last) table[`${key}.accept`] = t(`ui.quick.accept.${i + 1}`);
    table[`${key}.nugget`] = t(`ui.quick.nugget.${i + 1}`);
    stages.push({
      id: stageId,
      plan: { anchor: `${id}.anchor`, action: `${key}.action` },
      schedule: scheduleOf(answers.schedule),
      condition: { type: 'days', n: steps.length < 2 && i === 0 ? 3 : 5, of: 7 },
      story: { arrival: `${key}.arrival`, ...(last ? {} : { accept: `${key}.accept` }) },
      nugget: `${key}.nugget`,
    });
  }

  const ladder =
    typeof answers.ladder === 'string' && Object.hasOwn(LADDERS.ladders, answers.ladder)
      ? answers.ladder
      : LADDERS.defaultLadder;
  const daypart = DAYPARTS.find((d) => d === answers.daypart);
  const journey: Journey = {
    format: 3,
    id,
    version: 1,
    title: `${id}.title`,
    description: `${id}.description`,
    why: `${id}.why`,
    build: { ladder },
    anchor: { moment: `${id}.moment`, example: `${id}.anchor`, ...(daypart ? { daypart } : {}) },
    stages,
    ending: { story: `${id}.ending` },
    // English is the block every host falls back to, so the user's words
    // stand there too; their own language gets its block beside it.
    texts:
      language === FALLBACK_LANGUAGE
        ? { [FALLBACK_LANGUAGE]: table }
        : {
            [FALLBACK_LANGUAGE]: Object.fromEntries(
              Object.entries(table).filter(([key]) => !key.endsWith(PLAN_FORM)),
            ),
            [language]: table,
          },
  };
  const first = steps[0];
  return {
    journey,
    problems: journeyProblems(journey),
    hints: first !== undefined && first > TINY[measure] ? ['ui.quick.hint.smaller'] : [],
  };
};
