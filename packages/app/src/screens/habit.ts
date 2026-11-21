import type { Schedule, Weekday } from '@questarc/engine';
import { t } from '@questarc/ui/shared/texts';
import { h, icon, ICONS } from '@questarc/ui/ui/dom';
import { weekdayOfId } from '@questarc/ui/ui/journey/format';
import { scheduleText } from '@questarc/ui/ui/repeat';

import { isValidSchedule } from '../store/habit-actions';
import { at } from '../texts';
import { dayInWords } from './day-words';
import { keepFocus } from './keep-focus';

/**
 * A habit's page (#166; docs/behaviour.md "A habit"): pushed on Today,
 * with the way back in its header. It shows the plan sentence and lets
 * the user change the schedule (the three a stage may use), pause and
 * resume, and leave out the next time. Nothing here ends a habit or
 * removes a task.
 */

export interface HabitProps {
  readonly title: string;
  /** "After getting up, I will …", when a journey's step uses the habit. */
  readonly plan?: string;
  /** The schedule as stored. */
  readonly schedule: Schedule;
  /** The schedule as chosen on the page, not saved yet. */
  readonly draft: Schedule;
  /** False for a repeat with a reminder time: the schedule is only shown. */
  readonly canChange: boolean;
  readonly setDraft: (schedule: Schedule) => void;
  readonly saveSchedule: () => void;
  readonly paused: boolean;
  readonly setPaused: (paused: boolean) => void;
  /** The next occurrence after today that is not left out. */
  readonly next?: string;
  readonly leaveOut: (day: string) => void;
  /** Coming occurrences the user left out. */
  readonly leftOut: readonly string[];
  readonly takeBack: (day: string) => void;
  readonly back: () => void;
}

const DAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const STEPS = [2, 3, 4, 5, 6, 7];

const same = (a: Schedule, b: Schedule): boolean =>
  a.type === b.type &&
  (a.type !== 'everyNDays' || a.n === (b as typeof a).n) &&
  (a.type !== 'weekdays' ||
    DAYS.every((d) => a.days.includes(d) === (b as typeof a).days.includes(d)));

const card = (title: string, ...children: (Node | null)[]): Node =>
  h(
    'section',
    { class: 'qa-card qa-stack' },
    h('h2', { class: 'qa-section-title' }, title),
    ...children,
  );

const button = (id: string, label: string, onclick: () => void, disabled = false): Node =>
  h('button', { id, class: 'qa-btn qa-btn-secondary', type: 'button', disabled, onclick }, label);

const scheduleCard = (props: HabitProps): Node => {
  const { draft } = props;
  const now = scheduleText(props.schedule, weekdayOfId);
  if (!props.canChange)
    return card(
      at('habit.schedule'),
      h('p', {}, now),
      h('p', { class: 'qa-muted qa-small' }, at('habit.schedule.fixed')),
    );
  const kind = (type: Schedule['type'], label: string, pick: () => Schedule) =>
    h(
      'label',
      { class: 'qa-option' },
      h('input', {
        type: 'radio',
        name: 'app-schedule',
        id: `app-schedule-${type}`,
        checked: draft.type === type,
        onchange: () => props.setDraft(pick()),
      }),
      h('span', { class: 'qa-option-title' }, label),
    );
  const valid = isValidSchedule(draft);
  return card(
    at('habit.schedule'),
    h('p', { class: 'qa-muted' }, at('habit.schedule.now', { schedule: now })),
    h(
      'fieldset',
      { class: 'qa-fieldset', 'aria-label': at('habit.schedule') },
      kind('daily', t('ui.schedule.daily'), () => ({ type: 'daily' })),
      kind('everyNDays', at('habit.schedule.every'), () => ({ type: 'everyNDays', n: 2 })),
      draft.type === 'everyNDays'
        ? h(
            'select',
            {
              id: 'app-schedule-n',
              class: 'app-input app-sub',
              'aria-label': at('habit.schedule.every'),
              onchange: (event: Event) =>
                props.setDraft({
                  type: 'everyNDays',
                  n: Number((event.target as HTMLSelectElement).value),
                }),
            },
            ...STEPS.map((n) =>
              h('option', { value: n, selected: n === draft.n }, t('ui.schedule.every-n', { n })),
            ),
          )
        : null,
      kind('weekdays', at('habit.schedule.weekdays'), () => ({
        type: 'weekdays',
        days: props.schedule.type === 'weekdays' ? props.schedule.days : [],
      })),
      draft.type === 'weekdays'
        ? h(
            'div',
            {
              class: 'app-days app-sub',
              role: 'group',
              'aria-label': at('habit.schedule.weekdays'),
            },
            ...DAYS.map((day) =>
              h(
                'label',
                { class: 'app-day' },
                h('input', {
                  type: 'checkbox',
                  id: `app-day-${day}`,
                  checked: draft.days.includes(day),
                  onchange: (event: Event) => {
                    const on = (event.target as HTMLInputElement).checked;
                    props.setDraft({
                      type: 'weekdays',
                      days: DAYS.filter((d) => (d === day ? on : draft.days.includes(d))),
                    });
                  },
                }),
                h('span', {}, weekdayOfId(day)),
              ),
            ),
          )
        : null,
    ),
    valid ? null : h('p', { class: 'qa-callout', role: 'alert' }, at('habit.schedule.none')),
    h('p', { class: 'qa-muted qa-small' }, at('habit.schedule.text')),
    button(
      'app-schedule-save',
      at('habit.schedule.save'),
      props.saveSchedule,
      !valid || same(draft, props.schedule),
    ),
  );
};

export const renderHabit = (root: HTMLElement, props: HabitProps): void =>
  keepFocus(root, () =>
    root.replaceChildren(
      h(
        'header',
        { class: 'qa-header' },
        h(
          'button',
          {
            id: 'app-habit-back',
            class: 'qa-icon-btn',
            type: 'button',
            title: t('ui.action.back'),
            'aria-label': t('ui.action.back'),
            onclick: props.back,
          },
          icon(ICONS.back),
        ),
        h('h1', { class: 'qa-title' }, props.title),
      ),
      h(
        'main',
        { class: 'qa-main' },
        h(
          'div',
          { class: 'qa-stack' },
          props.plan ? h('p', { class: 'qa-plan' }, props.plan) : null,
          scheduleCard(props),
          card(
            at('habit.pause.title'),
            h('p', {}, props.paused ? t('ui.anchor.paused') : at('habit.pause.text')),
            props.paused
              ? button('app-habit-resume', at('habit.resume'), () => props.setPaused(false))
              : button('app-habit-pause', at('habit.pause'), () => props.setPaused(true)),
          ),
          card(
            at('habit.next.title'),
            props.next
              ? h('p', {}, at('habit.next', { day: dayInWords(props.next) }))
              : h('p', { class: 'qa-muted' }, at('habit.next.none')),
            h('p', { class: 'qa-muted qa-small' }, at('habit.leave-out.text')),
            props.next
              ? button('app-habit-leave-out', at('habit.leave-out'), () =>
                  props.leaveOut(props.next ?? ''),
                )
              : null,
            ...props.leftOut.map((day) =>
              h(
                'div',
                { class: 'app-field' },
                h('span', {}, at('habit.left-out', { day: dayInWords(day) })),
                h(
                  'button',
                  {
                    id: `app-take-back-${day}`,
                    class: 'qa-btn qa-btn-secondary app-inline',
                    type: 'button',
                    onclick: () => props.takeBack(day),
                  },
                  at('habit.take-back'),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
