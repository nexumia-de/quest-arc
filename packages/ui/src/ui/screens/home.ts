import { withdraw } from '@questarc/engine';

import { t } from '../../shared/texts';
import { art } from '../art-store';
import { h } from '../dom';
import { habitBanners } from '../habit-banners';
import type { Context, Screen } from '../screen';
import { confirmCard, growingStep } from '../valley/growing';
import { valleyModel } from '../valley/model';
import { valleyScene } from '../valley/scene';
import { readOnlyScreen } from './read-only';

/**
 * Screen 0, the home (docs/behaviour.md, #114): the Valley, the user's
 * moments as places along one path through the day, drawn from the
 * engine's `valley` view and layout. Below it, within thumb reach: the
 * growing step as a card that opens its journey, the banners, and the
 * main action **A New Moment**. A place opens when tapped: the journey
 * for the growing one, the moment otherwise. Where no moment stands yet
 * the land is plain, with the path.
 */
export const homeScreen = (ctx: Context): Screen => {
  const { view, journeys } = ctx.state;
  const readOnly = view.readOnly.find((r) => r.state === 'active');
  if (readOnly) return readOnlyScreen(ctx, readOnly);
  const ended = ctx.draft.ended as { runId: string; title: string } | undefined;
  const model = valleyModel(view.valley, view.anchors, journeys, art());
  const scene = valleyScene(
    model,
    ({ view: place }) =>
      ctx.go(place.growing ? { name: 'journey' } : { name: 'moment', anchorId: place.anchorId }),
    t('ui.valley.label'),
  );
  const active = view.anchors.some((a) => a.growing) ? view.active : undefined;
  const growing = active ? growingStep(ctx, active) : null;
  // Until the place has its own page, the growing moment is changed from here.
  const growingId = view.valley.find((place) => place.growing)?.anchorId;
  return {
    title: t('ui.app.name'),
    menu: [{ label: t('ui.shelf.title'), onSelect: () => ctx.go({ name: 'shelf' }) }],
    body: h(
      'div',
      { class: 'qa-home' },
      scene.element,
      h(
        'div',
        { class: 'qa-home-side qa-stack' },
        growing,
        growing && growingId
          ? h(
              'button',
              {
                class: 'qa-btn qa-btn-text',
                type: 'button',
                onclick: () => ctx.go({ name: 'moment', anchorId: growingId }),
              },
              t('ui.moment.change'),
            )
          : null,
        ...view.anchors.map((anchor) => confirmCard(ctx, anchor)),
        ended
          ? h(
              'div',
              { class: 'qa-banner', role: 'status' },
              h('p', {}, t('ui.banner.ended', { title: ended.title })),
              h(
                'button',
                {
                  class: 'qa-btn qa-btn-text',
                  type: 'button',
                  onclick: () => {
                    delete ctx.draft.ended;
                    void ctx.write(withdraw(`run-end:${ended.runId}`));
                  },
                },
                t('ui.action.undo'),
              ),
            )
          : null,
        ...habitBanners(ctx),
        view.anchors.length === 0
          ? h(
              'div',
              { class: 'qa-empty' },
              h('h2', { class: 'qa-heading' }, t('ui.home.empty.title')),
              h('p', { class: 'qa-muted' }, t('ui.home.empty.text')),
            )
          : null,
      ),
    ),
    actions: [
      h(
        'button',
        {
          class: `qa-btn ${view.active ? 'qa-btn-secondary' : 'qa-btn-primary'}`,
          type: 'button',
          onclick: () => ctx.go({ name: 'choose' }),
        },
        t('ui.anchor.new'),
      ),
    ],
  };
};
