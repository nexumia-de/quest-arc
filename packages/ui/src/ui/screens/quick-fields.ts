import { proposeSteps, QUICK_AMOUNT, type Weekday } from '@questarc/engine';

import type { QuickDraft, QuickForm } from '../../adapter/brain';
import { t } from '../../shared/texts';
import { h } from '../dom';
import { weekdayOfId } from '../journey/format';

/** The fields of the quick form's questions (screen 2a, #89). */

type Draft = QuickDraft & { missing?: boolean };

const MEASURES = ['minutes', 'pages', 'times', 'same'] as const;
const WEEKDAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const radio = (group: string, checked: boolean, label: string, onPick: () => void): Node =>
  h(
    'label',
    { class: 'qa-option' },
    h('input', { type: 'radio', name: group, checked, onchange: onPick }),
    h('span', { class: 'qa-option-text' }, h('span', { class: 'qa-option-title' }, label)),
  );

const amount = (label: string, value: number | undefined, onChange: (n: number) => void): Node =>
  h(
    'label',
    { class: 'qa-field' },
    h('span', { class: 'qa-section-title' }, label),
    h('input', {
      class: 'qa-input',
      type: 'number',
      inputmode: 'numeric',
      min: QUICK_AMOUNT.min,
      max: QUICK_AMOUNT.max,
      value: value ?? '',
      onchange: (event: Event) => {
        const n = Number((event.target as HTMLInputElement).value);
        if (Number.isInteger(n) && n >= QUICK_AMOUNT.min) onChange(n);
      },
    }),
  );

/** A text answer: the field, its hint and, after an empty Next, what is missing. */
export const wordsField = (
  draft: Draft,
  field: 'action' | 'anchor' | 'name',
  limit: number,
  label: string,
  hint: string,
): Node[] => {
  const input = h('input', {
    class: 'qa-input',
    type: 'text',
    maxlength: limit,
    autocomplete: 'off',
    'aria-label': label,
    'aria-describedby': `qa-quick-${field}-hint`,
    oninput: () => {
      draft[field] = input.value;
    },
  }) as HTMLInputElement;
  input.value = draft[field] ?? '';
  return [
    input,
    h('p', { id: `qa-quick-${field}-hint`, class: 'qa-muted qa-small' }, hint),
    draft.missing ? h('p', { class: 'qa-callout', role: 'alert' }, t('ui.quick.missing')) : null,
  ].filter((node): node is HTMLElement => node !== null);
};

/**
 * How it grows: the measure, then a first and a last step; the steps
 * between are proposed (engine `proposeSteps`) and each can be changed.
 */
export const measureFields = (draft: Draft, redraw: () => void): Node[] => {
  const steps = [...(draft.steps ?? [])];
  const propose = (first: number, last: number) => {
    draft.steps = proposeSteps(first, last);
    redraw();
  };
  const measures = MEASURES.map((measure) =>
    radio('qa-quick-measure', draft.measure === measure, t(`ui.quick.measure.${measure}`), () => {
      draft.measure = measure;
      redraw();
    }),
  );
  if (draft.measure === 'same') return [h('fieldset', { class: 'qa-fieldset' }, ...measures)];
  const first = steps[0];
  const last = steps.at(-1);
  return [
    h('fieldset', { class: 'qa-fieldset' }, ...measures),
    amount(t('ui.quick.first'), first, (n) => propose(n, Math.max(n, last ?? n))),
    amount(t('ui.quick.last'), last, (n) => propose(first ?? 1, n)),
    steps.length > 1
      ? h(
          'fieldset',
          { class: 'qa-fieldset' },
          h('legend', { class: 'qa-section-title' }, t('ui.quick.steps')),
          h('p', { class: 'qa-muted qa-small' }, t('ui.quick.steps.text')),
          ...steps.map((value, i) =>
            amount(t('ui.quick.step', { n: i + 1 }), value, (n) => {
              steps[i] = n;
              draft.steps = steps;
            }),
          ),
        )
      : null,
  ].filter((node): node is HTMLElement => node !== null);
};

/** How often: the three schedules journeys follow (game rules §2). */
export const scheduleFields = (draft: Draft, redraw: () => void): Node[] => {
  const schedule = draft.schedule ?? { type: 'daily' };
  const set = (next: QuickForm['schedule']) => {
    draft.schedule = next;
    redraw();
  };
  const days = schedule.type === 'weekdays' ? schedule.days : [];
  return [
    h(
      'fieldset',
      { class: 'qa-fieldset' },
      radio('qa-quick-often', schedule.type === 'daily', t('ui.schedule.daily'), () =>
        set({ type: 'daily' }),
      ),
      radio('qa-quick-often', schedule.type === 'everyNDays', t('ui.quick.every-few'), () =>
        set({ type: 'everyNDays', n: 2 }),
      ),
      radio('qa-quick-often', schedule.type === 'weekdays', t('ui.quick.chosen-days'), () =>
        set({ type: 'weekdays', days: ['mon', 'wed', 'fri'] }),
      ),
    ),
    schedule.type === 'everyNDays'
      ? h(
          'label',
          { class: 'qa-field' },
          h('span', { class: 'qa-section-title' }, t('ui.quick.every-n')),
          h(
            'select',
            {
              class: 'qa-input',
              onchange: (event: Event) =>
                set({ type: 'everyNDays', n: Number((event.target as HTMLSelectElement).value) }),
            },
            ...[2, 3, 4, 5, 6, 7].map((n) =>
              h(
                'option',
                { value: n, selected: n === schedule.n },
                t('ui.schedule.every-n', { n }),
              ),
            ),
          ),
        )
      : null,
    schedule.type === 'weekdays'
      ? h(
          'fieldset',
          { class: 'qa-fieldset' },
          ...WEEKDAYS.map((day) =>
            h(
              'label',
              { class: 'qa-option' },
              h('input', {
                type: 'checkbox',
                checked: days.includes(day),
                onchange: (event: Event) => {
                  const on = (event.target as HTMLInputElement).checked;
                  const chosen = WEEKDAYS.filter((d) => (d === day ? on : days.includes(d)));
                  // At least one day: unticking the last one keeps it.
                  set({ type: 'weekdays', days: chosen.length > 0 ? chosen : [day] });
                },
              }),
              h(
                'span',
                { class: 'qa-option-text' },
                h('span', { class: 'qa-option-title' }, weekdayOfId(day)),
              ),
            ),
          ),
        )
      : null,
  ].filter((node): node is HTMLElement => node !== null);
};
