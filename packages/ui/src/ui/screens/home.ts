import { withdraw } from '@questarc/engine';

import { t } from '../../shared/texts';
import { art } from '../art-store';
import { h } from '../dom';
import { habitBanners } from '../habit-banners';
import type { Context, Screen } from '../screen';
import { confirmCard, growingStep } from '../valley/growing';
import { sceneHeight, valleyModel } from '../valley/model';
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
  // The scene is as wide as the page up to 440 px, from 640 px beside a card of at least
  // 240 px (style.css), and two thirds of the window high.
  const viewport = document.documentElement.clientWidth;
  const page = viewport - 32;
  const pixels = Math.min(440, Math.max(viewport >= 640 ? page - 24 - 240 : page, 1));
  const model = valleyModel(view.valley, view.anchors, journeys, art(), {
    height: sceneHeight(window.innerHeight, pixels),
  });
  const scene = valleyScene(
    model,
    ({ view: place }) =>
      ctx.go(place.growing ? { name: 'journey' } : { name: 'place', anchorId: place.anchorId }),
    t('ui.valley.label'),
  );
  const active = view.anchors.some((a) => a.growing) ? view.active : undefined;
  const growing = active ? growingStep(ctx, active) : null;
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
