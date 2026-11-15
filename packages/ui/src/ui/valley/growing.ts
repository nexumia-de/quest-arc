import { confirmAnchor, type AnchorView, type RunView } from '@questarc/engine';

import { planSentence } from '../../shared/plan';
import { newRunId } from '../../shared/run-id';
import { t } from '../../shared/texts';
import { h } from '../dom';
import { conditionText } from '../journey/card';
import { suggestedWords } from '../journey/moment';
import type { Context } from '../screen';

/**
 * What stands below the Valley's picture (docs/behaviour.md screen 0): the
 * growing step as a card that opens the journey, and, for a journey from
 * before anchors, the one question whether its moment is the user's.
 */

/** The growing step: its plan, its progress in words and what today looks like. */
export const growingStep = (ctx: Context, run: RunView): HTMLElement | null => {
  const { view, journeys } = ctx.state;
  const journey = journeys.find((j) => j.id === run.journeyId);
  const index = run.position.stage;
  const station = run.stations[index];
  const stage = journey?.stages[index];
  if (!station || !stage) return null;
  const bound = station.state === 'current' || station.state === 'met';
  const today = station.lastDays?.find((d) => d.day === view.todayStr)?.mark;
  const state = run.comeBack
    ? t('ui.comeback.title')
    : run.paused
      ? t('ui.anchor.paused')
      : station.state === 'met'
        ? t(run.offer?.quietUntil ? 'ui.card.staying' : 'ui.card.met')
        : station.state === 'unbound'
          ? t('ui.card.unbound')
          : station.state === 'unsupported-repeat'
            ? t('ui.card.unsupported')
            : today === 'done' || today === 'open'
              ? t(`ui.anchor.today.${today}`)
              : undefined;
  return h(
    'button',
    { class: 'qa-growing', type: 'button', onclick: () => ctx.go({ name: 'journey' }) },
    h(
      'span',
      { class: 'qa-overline' },
      `${t('ui.anchor.growing')} · ${t('ui.station.of', { n: index + 1, total: run.stations.length })}`,
    ),
    h('span', { class: 'qa-plan' }, planSentence(stage, station.pair, run.anchor)),
    bound ? h('span', {}, conditionText(stage, station)) : null,
    state ? h('span', { class: 'qa-muted qa-small' }, state) : null,
  ) as HTMLElement;
};

/** From before anchors: asked once, in place; nothing depends on the answer. */
export const confirmCard = (ctx: Context, anchor: AnchorView): HTMLElement | null => {
  const { view, journeys } = ctx.state;
  const suggested = anchor.suggest;
  if (!suggested) return null;
  const button = (label: string, onclick: () => void) =>
    h('button', { class: 'qa-btn qa-btn-secondary', type: 'button', onclick }, label);
  return h(
    'section',
    { class: 'qa-card qa-stack' },
    h('p', {}, t('ui.anchor.confirm')),
    button(t('ui.anchor.confirm.yes'), () => {
      void ctx.write(
        confirmAnchor(view, {
          journeyId: suggested,
          anchorId: newRunId(),
          anchor: suggestedWords(anchor, journeys),
        }),
      );
    }),
    button(t('ui.anchor.confirm.change'), () =>
      ctx.go({ name: 'moment', anchorId: '', journeyId: suggested }),
    ),
  ) as HTMLElement;
};
