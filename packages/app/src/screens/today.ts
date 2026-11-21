import { language, t } from '@questarc/ui/shared/texts';
import { h } from '@questarc/ui/ui/dom';
import { routineRow } from '@questarc/ui/ui/screens/place';

import type { StoredTask } from '../store/dataset';
import { at } from '../texts';
import type { TodayMoment, TodayRow } from './today-moments';

/**
 * Today (#93, by moments #164; docs/behaviour.md "Today"): the habits
 * due today under the moments they start from, in the order of the day.
 * Each is ticked off with one tap and opened again with another; the
 * growing step says so in words. What runs by itself stands at its
 * moment in a line without a box. A task left open from an earlier day
 * says from when; the app has no other tasks.
 */

export interface TodayProps {
  readonly today: string;
  /** Today's tasks by moment (`todayMoments`); empty when nothing is due. */
  readonly moments: readonly TodayMoment[];
  /** Whether any habit exists; without one the screen points to the journey. */
  readonly hasHabits: boolean;
  readonly toggle: (task: StoredTask) => void;
  readonly openJourney: () => void;
}

const CHECK = 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z';

const row = ({ task, growing }: TodayRow, props: TodayProps): Node =>
  h(
    'li',
    {},
    h(
      'button',
      {
        class: 'qa-card qa-card-button app-habit',
        type: 'button',
        role: 'checkbox',
        'data-task': task.id,
        'aria-checked': task.isDone ? 'true' : 'false',
        title: at(task.isDone ? 'today.done' : 'today.open'),
        onclick: () => props.toggle(task),
      },
      h(
        'span',
        { class: 'app-check', 'aria-hidden': 'true' },
        task.isDone
          ? h('svg', { viewBox: '0 0 24 24', width: 20, height: 20 }, h('path', { d: CHECK }))
          : null,
      ),
      h(
        'span',
        { class: 'qa-option-text' },
        // In words, not by colour: the one step that grows (design rule 28).
        growing ? h('span', { class: 'qa-overline' }, t('ui.anchor.growing')) : null,
        h('span', { class: 'qa-plan' }, task.title),
        task.dueDay && task.dueDay < props.today
          ? h('span', { class: 'qa-muted qa-small' }, at('today.earlier', { day: task.dueDay }))
          : null,
      ),
    ),
  );

/** A moment with what stands under it today; the last group may have no moment. */
const moment = (group: TodayMoment, index: number, props: TodayProps): Node => {
  const id = `app-moment-${index}`;
  const title = group.title ?? (props.moments.length > 1 ? at('today.other') : undefined);
  return h(
    'section',
    { class: 'app-moment', ...(title ? { 'aria-labelledby': id } : {}) },
    title ? h('h2', { id, class: 'qa-section-title' }, title) : null,
    h(
      'ul',
      { class: 'qa-list app-habits' },
      ...group.rows.map((each) => row(each, props)),
      ...group.byItself.map((step) => {
        const line = routineRow('li', step, t('ui.routine.by-itself'));
        line.classList.add('app-by-itself');
        return line;
      }),
    ),
  );
};

export const renderToday = (root: HTMLElement, props: TodayProps): void => {
  // A redraw after a tick keeps the keyboard's place on the task.
  const focused = root.contains(document.activeElement)
    ? (document.activeElement as HTMLElement).dataset.task
    : undefined;
  const date = new Date(`${props.today}T12:00:00`).toLocaleDateString(
    language() === 'de' ? 'de-DE' : undefined,
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  );
  root.replaceChildren(
    h('header', { class: 'qa-header app-header' }, h('h1', { class: 'qa-title' }, at('tab.today'))),
    h(
      'main',
      { class: 'qa-main' },
      h(
        'div',
        { class: 'qa-stack' },
        h('p', { class: 'qa-muted' }, date),
        ...props.moments.map((group, index) => moment(group, index, props)),
        props.moments.some((group) => group.rows.length > 0) ? null : h('p', {}, at('today.empty')),
        props.hasHabits ? null : h('p', { class: 'qa-muted' }, at('today.none')),
      ),
    ),
    ...(props.hasHabits
      ? []
      : [
          h(
            'footer',
            { class: 'qa-actions' },
            h(
              'button',
              { class: 'qa-btn qa-btn-primary', type: 'button', onclick: props.openJourney },
              at('today.open-journey'),
            ),
          ),
        ]),
  );
  if (focused)
    [...root.querySelectorAll<HTMLElement>('[data-task]')]
      .find((button) => button.dataset.task === focused)
      ?.focus();
};
