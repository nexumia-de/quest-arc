import { forgetJourney, journeyInUse, type Journey } from '@questarc/engine';

import { planSentence } from '../../shared/plan';
import { t } from '../../shared/texts';
import { h } from '../dom';
import type { Context, MenuItem, Screen } from '../screen';
import { exportName, exportText, isOwnJourney } from './own-journey';

/**
 * Screen 2, preview: every station of a journey as a plan sentence. A
 * journey of the user's own can be exported as a file and, while no run
 * uses it, removed with Undo (#40).
 */
export const previewScreen = (ctx: Context, journeyId: string, anchorId?: string): Screen => {
  const removed = ctx.draft.removed as Journey | undefined;
  if (removed?.id === journeyId) return removedScreen(ctx, removed);
  const journey = ctx.state.journeys.find((j) => j.id === journeyId);
  if (!journey) return { title: t('ui.app.name'), body: h('p', {}, t('ui.error.gone')) };
  const own = isOwnJourney(ctx.state, journey.id);
  const menu: MenuItem[] = [];
  const save = ctx.host.saveFile;
  if (own && save)
    menu.push({
      label: t('ui.preview.export'),
      onSelect: () => void save(exportName(journey.id), exportText(journey)),
    });
  if (own && !journeyInUse(ctx.state.view, journey.id))
    menu.push({
      label: t('ui.preview.remove'),
      onSelect: () => {
        // Undo, not confirm: removing is one record, written back by Undo.
        ctx.draft.removed = journey;
        void ctx.write(forgetJourney(ctx.state.view, journey.id));
      },
    });
  return {
    title: t(journey.title),
    ...(menu.length > 0 ? { menu } : {}),
    body: h(
      'div',
      { class: 'qa-stack' },
      h('p', {}, t(journey.description)),
      own ? h('p', { class: 'qa-muted qa-small' }, t('ui.choose.own')) : null,
      journey.author
        ? h('p', { class: 'qa-muted qa-small' }, t('ui.journey.author', { name: journey.author }))
        : null,
      h('h2', { class: 'qa-section-title' }, t('ui.preview.stations')),
      h(
        'ol',
        { class: 'qa-steps' },
        ...journey.stages.map((stage) => h('li', {}, planSentence(stage))),
      ),
    ),
    actions: [
      h(
        'button',
        {
          class: 'qa-btn qa-btn-primary',
          type: 'button',
          onclick: () =>
            ctx.go({ name: 'start', journeyId: journey.id, ...(anchorId ? { anchorId } : {}) }),
        },
        t('ui.preview.start'),
      ),
    ],
  };
};

/** After Remove: what was removed, with Undo writing the record back. */
const removedScreen = (ctx: Context, journey: Journey): Screen => ({
  title: t(journey.title),
  body: h(
    'div',
    { class: 'qa-banner', role: 'status' },
    h('p', {}, t('ui.preview.removed', { title: t(journey.title) })),
    h(
      'button',
      {
        class: 'qa-btn qa-btn-text',
        type: 'button',
        onclick: () => {
          delete ctx.draft.removed;
          void ctx.write({ [`journey:${journey.id}`]: journey });
        },
      },
      t('ui.action.undo'),
    ),
  ),
});
