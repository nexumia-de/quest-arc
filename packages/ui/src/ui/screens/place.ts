import type { AnchorView } from '@questarc/engine';

import { capitalise } from '../../shared/plan';
import { stageAction, t } from '../../shared/texts';
import { h } from '../dom';
import { habitBanners } from '../habit-banners';
import { anchorTitle } from '../journey/moment';
import type { Context, Screen } from '../screen';
import { placeSection } from '../valley/place';

/**
 * The routine of a moment in words (docs/behaviour.md, the place): each
 * step still followed or running by itself, and what waits. Nothing is
 * ticked, counted or shown as due for what runs by itself.
 */
export const routineCard = (ctx: Context, anchor: AnchorView): HTMLElement => {
  const { journeys } = ctx.state;
  const rows = [
    ...anchor.steps.map((step) => ({
      text: stageAction(step.journeyId, step.stageId),
      note: t(step.state === 'graduated' ? 'ui.routine.by-itself' : 'ui.routine.followed'),
    })),
    ...anchor.resting.map((step) => ({
      text: t(journeys.find((j) => j.id === step.journeyId)?.title ?? ''),
      note: t('ui.routine.waiting'),
    })),
  ];
  return h(
    'section',
    { class: 'qa-card' },
    h('h2', { class: 'qa-section-title' }, t('ui.routine.title')),
    rows.length === 0 ? h('p', { class: 'qa-muted' }, t('ui.anchor.nothing')) : null,
    ...rows.map(({ text, note }) =>
      h(
        'p',
        { class: 'qa-routine' },
        h('span', {}, capitalise(text ?? '')),
        h('span', { class: 'qa-muted qa-small' }, note),
      ),
    ),
    anchor.steps.some((step) => step.state === 'graduated')
      ? h('p', { class: 'qa-muted qa-small' }, t('ui.routine.nothing-ticked'))
      : null,
  ) as HTMLElement;
};

/** **Extend This Moment**: screen 2 for the moment (on the place and on screen 0a). */
export const extendButton = (ctx: Context, anchorId: string) =>
  h(
    'button',
    {
      class: 'qa-btn qa-btn-secondary',
      type: 'button',
      onclick: () => ctx.go({ name: 'choose', anchorId }),
    },
    t('ui.anchor.extend'),
  );

/**
 * The place at rest (docs/behaviour.md): the place piece with its thing
 * and sign, the versions that stand, the routine in words, the questions
 * that are due, and **Extend This Moment**. The pencil opens "Change this
 * moment". A place with a growing journey opens that journey instead.
 */
export const placeScreen = (ctx: Context, anchorId: string): Screen => {
  const { view, journeys } = ctx.state;
  const place = view.valley.find((p) => p.anchorId === anchorId);
  const anchor = view.anchors.find((a) => a.id === anchorId);
  if (!place || !anchor) {
    // Removed in the meantime: the Valley shows what stands.
    queueMicrotask(() => ctx.reset({ name: 'home' }));
    return { title: t('ui.app.name'), body: h('p', {}) };
  }
  return {
    title: anchorTitle(anchor, journeys),
    body: h(
      'div',
      { class: 'qa-place' },
      placeSection(ctx, place),
      h(
        'div',
        { class: 'qa-place-side qa-stack' },
        routineCard(ctx, anchor),
        ...habitBanners(ctx, anchorId),
        place.growing ? null : extendButton(ctx, anchorId),
      ),
    ),
  };
};
