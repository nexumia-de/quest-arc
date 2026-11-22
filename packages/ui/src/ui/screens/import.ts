import type { Journey, KeptJourney } from '@questarc/engine';

import { planSentence } from '../../shared/plan';
import { addJourneyTexts, t } from '../../shared/texts';
import { h } from '../dom';
import type { Context, Screen } from '../screen';

/**
 * Screen 2b: a journey file the user chose (#40). The engine's journey
 * checker ran first, as in CI (in plugin.js: the view has no room for it); errors keep the file from being kept,
 * warnings are hints for its author and never block. A journey that
 * passes shows its stations as plan sentences before **Keep This
 * Journey** writes its `journey:<id>` record. The file is data only:
 * every text is shown as plain text.
 */
export const importScreen = (
  ctx: Context,
  file: unknown,
  kept: KeptJourney,
  anchorId?: string,
): Screen => {
  const errors = kept.problems.filter((p) => p.level === 'error');
  const hints = kept.problems.filter((p) => p.level !== 'error');
  // Without errors the checker found a whole journey (keepJourney).
  const journey = errors.length === 0 ? (file as Journey) : undefined;
  // The file's own texts, so its stations read as they will (a kept
  // journey's texts arrive with the state).
  if (journey) addJourneyTexts([journey]);
  const replaces =
    journey !== undefined && ctx.state.records[`journey:${journey.id}`] !== undefined;
  const problemList = (problems: typeof errors) =>
    h(
      'ul',
      { class: 'qa-list qa-small' },
      ...problems.map((p) => h('li', {}, p.at ? `${p.at}: ${p.message}` : p.message)),
    );
  return {
    title: journey ? t(journey.title) : t('ui.import.title'),
    body: h(
      'div',
      { class: 'qa-stack' },
      errors.length > 0
        ? h(
            'div',
            { class: 'qa-stack', role: 'alert' },
            h('p', {}, t('ui.import.errors')),
            problemList(errors),
          )
        : null,
      journey ? h('p', {}, t(journey.description)) : null,
      journey?.author
        ? h('p', { class: 'qa-muted qa-small' }, t('ui.journey.author', { name: journey.author }))
        : null,
      journey ? h('h2', { class: 'qa-section-title' }, t('ui.preview.stations')) : null,
      journey
        ? h(
            'ol',
            { class: 'qa-steps' },
            ...journey.stages.map((stage) => h('li', {}, planSentence(stage))),
          )
        : null,
      replaces ? h('p', { class: 'qa-muted' }, t('ui.import.replaces')) : null,
      hints.length > 0
        ? h(
            'details',
            { class: 'qa-details' },
            h('summary', {}, t('ui.import.hints')),
            problemList(hints),
          )
        : null,
    ),
    actions: journey
      ? [
          h(
            'button',
            {
              class: 'qa-btn qa-btn-primary',
              type: 'button',
              onclick: () =>
                void ctx.write(kept.changes).then(() => {
                  ctx.back();
                  ctx.go({
                    name: 'preview',
                    journeyId: journey.id,
                    ...(anchorId ? { anchorId } : {}),
                  });
                }),
            },
            t('ui.import.keep'),
          ),
        ]
      : [],
  };
};
