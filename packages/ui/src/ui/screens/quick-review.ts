import type { QuickForm, QuickResult } from '../../adapter/brain';
import { planSentence } from '../../shared/plan';
import { addJourneyTexts, t } from '../../shared/texts';
import { h } from '../dom';
import type { Context, Screen } from '../screen';

/**
 * The quick form's last screen (screen 2a, #89): the plan sentence of
 * every step of the journey the host built from the answers, the kind
 * hint when the first step is not tiny (rule 1, never blocking), the
 * checker's errors in plain words, and **Keep This Journey**.
 */
export const review = (
  ctx: Context,
  answers: QuickForm,
  kept: (journeyId: string) => void,
): Screen => {
  const draft = ctx.draft as { result?: QuickResult; asked?: boolean; failed?: boolean };
  if (!draft.asked) {
    draft.asked = true;
    void ctx.quick(answers).then(
      (result) => {
        draft.result = result;
        ctx.redraw();
      },
      () => {
        draft.failed = true;
        ctx.redraw();
      },
    );
  }
  const result = draft.result;
  if (!result)
    return {
      title: t('ui.quick.form.title'),
      body: h('p', { class: 'qa-muted' }, t(draft.failed ? 'ui.error.write' : 'ui.quick.making')),
    };
  // The journey's own texts, so its steps read as they will.
  addJourneyTexts([result.journey]);
  const errors = result.problems.filter((p) => p.level === 'error');
  const canKeep = errors.length === 0 && Object.keys(result.changes).length > 0;
  return {
    title: t(result.journey.title),
    body: h(
      'div',
      { class: 'qa-stack' },
      h('h2', { class: 'qa-heading' }, t('ui.quick.review')),
      h(
        'ol',
        { class: 'qa-steps' },
        ...result.journey.stages.map((stage) => h('li', {}, planSentence(stage))),
      ),
      ...result.hints.map((hint) => h('p', { class: 'qa-callout' }, t(hint))),
      errors.length > 0
        ? h(
            'div',
            { class: 'qa-stack', role: 'alert' },
            h('p', {}, t('ui.import.errors')),
            h('ul', { class: 'qa-list qa-small' }, ...errors.map((p) => h('li', {}, p.message))),
          )
        : null,
    ),
    actions: canKeep
      ? [
          h(
            'button',
            {
              class: 'qa-btn qa-btn-primary',
              type: 'button',
              onclick: () => void ctx.write(result.changes).then(() => kept(result.journey.id)),
            },
            t('ui.import.keep'),
          ),
        ]
      : [],
  };
};
