import { planSentence } from '../../shared/plan';
import { t } from '../../shared/texts';
import { h } from '../dom';
import type { Context, Screen } from '../screen';
import { isOwnJourney } from './own-journey';

/**
 * Screen 2: the journeys with their first step as a plan sentence, the
 * user's own after the built-in ones, and the import of a journey file
 * (#40). With `anchorId` the journey extends that moment (screen 0).
 */
export const chooseScreen = (ctx: Context, anchorId?: string): Screen => {
  const error = typeof ctx.draft.importError === 'string' ? ctx.draft.importError : undefined;
  const file = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: (event: Event) => {
      const input = event.target as HTMLInputElement;
      const chosen = input.files?.[0];
      input.value = '';
      if (!chosen) return;
      void chosen.text().then(async (text) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          ctx.draft.importError = t('ui.import.not-json');
          ctx.redraw();
          return;
        }
        delete ctx.draft.importError;
        const kept = await ctx.checkJourney(parsed);
        ctx.go({ name: 'import', file: parsed, kept, ...(anchorId ? { anchorId } : {}) });
      });
    },
  }) as HTMLInputElement;
  return {
    title: t('ui.choose.title'),
    body: h(
      'div',
      { class: 'qa-stack' },
      h(
        'ul',
        { class: 'qa-list' },
        ...ctx.state.journeys.map((journey) => {
          const first = journey.stages[0];
          return h(
            'li',
            {},
            h(
              'button',
              {
                class: 'qa-card qa-card-button',
                type: 'button',
                onclick: () =>
                  ctx.go({
                    name: 'preview',
                    journeyId: journey.id,
                    ...(anchorId ? { anchorId } : {}),
                  }),
              },
              h('span', { class: 'qa-section-title' }, t(journey.title)),
              h('span', {}, t(journey.description)),
              h(
                'span',
                { class: 'qa-muted qa-small' },
                t('ui.choose.stations', { n: journey.stages.length }),
              ),
              isOwnJourney(ctx.state, journey.id)
                ? h('span', { class: 'qa-muted qa-small' }, t('ui.choose.own'))
                : null,
              journey.author
                ? h(
                    'span',
                    { class: 'qa-muted qa-small' },
                    t('ui.journey.author', { name: journey.author }),
                  )
                : null,
              first ? h('span', { class: 'qa-plan' }, planSentence(first)) : null,
            ),
          );
        }),
      ),
      h(
        'section',
        { class: 'qa-stack' },
        h(
          'button',
          {
            class: 'qa-btn qa-btn-secondary',
            type: 'button',
            onclick: () =>
              ctx.go({ name: 'quick', step: 1, answers: {}, ...(anchorId ? { anchorId } : {}) }),
          },
          t('ui.choose.quick'),
        ),
        h('p', { class: 'qa-muted qa-small' }, t('ui.choose.quick.text')),
        h(
          'button',
          { class: 'qa-btn qa-btn-secondary', type: 'button', onclick: () => file.click() },
          t('ui.choose.import'),
        ),
        h('p', { class: 'qa-muted qa-small' }, t('ui.choose.import.text')),
        error ? h('p', { role: 'alert' }, error) : null,
        file,
      ),
    ),
  };
};
