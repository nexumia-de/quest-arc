import { t } from '@questarc/ui/shared/texts';
import { h, icon, ICONS } from '@questarc/ui/ui/dom';
import { routineRow } from '@questarc/ui/ui/screens/place';

import type { StoredTask } from '../store/dataset';
import { isWontDo } from '../store/habit-actions';
import { at } from '../texts';
import { dayInWords } from './day-words';
import { keepFocus } from './keep-focus';
import type { TodayMoment, TodayRow } from './today-moments';

/**
 * Today (#93, by moments #164, won't do #166; docs/behaviour.md
 * "Today"): the habits due today under the moments they start from, in
 * the order of the day. Each is ticked off with one tap and opened
 * again with another; the growing step says so in words. The button
 * beside a task opens what else can be done with it: leave it out for
 * today ("won't do") and the habit's page. What runs by itself stands
 * at its moment in a line without a box. A task left open from an
 * earlier day says from when; habits without a task today are listed
 * last, so their page can be reached.
 */

/** A habit without a task today: its page is reached from its line. */
export interface RestingHabit {
  readonly id: string;
  readonly title: string;
  /** "Paused", or its schedule in words. */
  readonly note: string;
}

export interface TodayProps {
  readonly today: string;
  /** Today's tasks by moment (`todayMoments`); empty when nothing is due. */
  readonly moments: readonly TodayMoment[];
  /** Habits that are paused or not due today. */
  readonly resting: readonly RestingHabit[];
  /** Whether any habit exists; without one the screen points to the journey. */
  readonly hasHabits: boolean;
  /** The task whose further actions are open. */
  readonly panel?: string;
  readonly togglePanel: (taskId: string) => void;
  readonly toggle: (task: StoredTask) => void;
  readonly wontDo: (task: StoredTask) => void;
  readonly openHabit: (cfgId: string) => void;
  readonly openJourney: () => void;
}

const CHECK = 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z';
const DASH = 'M6 11h12v2H6z';
const NEXT = 'M9.3 6.7 14.6 12l-5.3 5.3 1.4 1.4L17.4 12l-6.7-6.7z';

const secondary = (id: string, label: string, onclick: () => void): Node =>
  h('button', { id, class: 'qa-btn qa-btn-secondary', type: 'button', onclick }, label);

const row = ({ task, growing }: TodayRow, props: TodayProps): Node => {
  const left = isWontDo(task);
  const done = task.isDone && !left;
  const open = props.panel === task.id;
  const panel = `app-panel-${task.id}`;
  return h(
    'li',
    { class: 'app-task' },
    h(
      'div',
      { class: 'qa-card app-row' },
      h(
        'button',
        {
          class: 'qa-card-button app-habit',
          type: 'button',
          role: 'checkbox',
          id: `app-task-${task.id}`,
          'aria-checked': done ? 'true' : 'false',
          'data-state': left ? 'left' : done ? 'done' : 'open',
          title: at(left ? 'today.left' : done ? 'today.done' : 'today.open'),
          onclick: () => props.toggle(task),
        },
        h(
          'span',
          { class: 'app-check', 'aria-hidden': 'true' },
          task.isDone
            ? h(
                'svg',
                { viewBox: '0 0 24 24', width: 20, height: 20 },
                h('path', { d: left ? DASH : CHECK }),
              )
            : null,
        ),
        h(
          'span',
          { class: 'qa-option-text' },
          // In words, not by colour: the one step that grows (design rule 28).
          growing ? h('span', { class: 'qa-overline' }, t('ui.anchor.growing')) : null,
          h('span', { class: 'qa-plan' }, task.title),
          left ? h('span', { class: 'qa-muted qa-small' }, at('today.left')) : null,
          !task.isDone && task.dueDay && task.dueDay < props.today
            ? h('span', { class: 'qa-muted qa-small' }, at('today.earlier', { day: task.dueDay }))
            : null,
        ),
      ),
      h(
        'button',
        {
          class: 'qa-icon-btn',
          type: 'button',
          id: `app-more-${task.id}`,
          title: at('today.more'),
          'aria-label': at('today.more.of', { title: task.title }),
          'aria-expanded': open ? 'true' : 'false',
          'aria-controls': panel,
          onclick: () => props.togglePanel(task.id),
        },
        icon(ICONS.menu),
      ),
    ),
    open
      ? h(
          'div',
          { id: panel, class: 'app-panel' },
          task.isDone
            ? null
            : secondary(`app-wont-${task.id}`, at('today.wont-do'), () => props.wontDo(task)),
          task.repeatCfgId
            ? secondary(`app-about-${task.id}`, at('today.habit'), () =>
                props.openHabit(task.repeatCfgId ?? ''),
              )
            : null,
        )
      : null,
  );
};

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

/** The habits without a task today, each a button to its page. */
const resting = (props: TodayProps): Node | null =>
  props.resting.length === 0
    ? null
    : h(
        'section',
        { class: 'app-moment', 'aria-labelledby': 'app-resting' },
        h('h2', { id: 'app-resting', class: 'qa-section-title' }, at('today.resting')),
        h(
          'ul',
          { class: 'qa-list app-habits' },
          ...props.resting.map((habit) =>
            h(
              'li',
              {},
              h(
                'button',
                {
                  class: 'qa-card qa-card-button app-habit app-resting',
                  type: 'button',
                  id: `app-habit-${habit.id}`,
                  onclick: () => props.openHabit(habit.id),
                },
                h(
                  'span',
                  { class: 'qa-option-text' },
                  h('span', { class: 'qa-plan' }, habit.title),
                  h('span', { class: 'qa-muted qa-small' }, habit.note),
                ),
                h(
                  'svg',
                  {
                    viewBox: '0 0 24 24',
                    width: 24,
                    height: 24,
                    class: 'qa-icon',
                    'aria-hidden': 'true',
                  },
                  h('path', { d: NEXT }),
                ),
              ),
            ),
          ),
        ),
      );

export const renderToday = (root: HTMLElement, props: TodayProps): void =>
  keepFocus(root, () =>
    root.replaceChildren(
      h(
        'header',
        { class: 'qa-header app-header' },
        h('h1', { class: 'qa-title' }, at('tab.today')),
      ),
      h(
        'main',
        { class: 'qa-main' },
        h(
          'div',
          { class: 'qa-stack' },
          h('p', { class: 'qa-muted' }, dayInWords(props.today)),
          ...props.moments.map((group, index) => moment(group, index, props)),
          props.moments.some((group) => group.rows.length > 0)
            ? null
            : h('p', {}, at('today.empty')),
          resting(props),
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
    ),
  );
