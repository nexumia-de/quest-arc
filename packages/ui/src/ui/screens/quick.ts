import { QUICK_LIMITS, type QuickMeasure } from '@questarc/engine';

import type { QuickDraft, QuickForm } from '../../adapter/brain';
import { t } from '../../shared/texts';
import { h } from '../dom';
import type { Context, Screen } from '../screen';
import { measureFields, scheduleFields, wordsField } from './quick-fields';
import { review } from './quick-review';

/**
 * Screen 2a, the quick journey (#89): one question per screen, nothing
 * focused on opening, back at any time (the header's back is the
 * previous question). Each screen keeps its edits in its draft; **Next**
 * carries the answers so far to the next question in the route. The
 * last screen shows what the host built from them (`quickJourney` runs
 * in plugin.js, with the journey checker) before **Keep This Journey**.
 */

export const QUICK_STEPS = 5;

export const quickScreen = (
  ctx: Context,
  step: number,
  answers: Partial<QuickForm>,
  anchorId?: string,
): Screen => {
  const draft = ctx.draft as QuickDraft & { missing?: boolean };
  const next = (more: Partial<QuickForm>) =>
    ctx.go({
      name: 'quick',
      step: step + 1,
      answers: { ...answers, ...more },
      ...(anchorId ? { anchorId } : {}),
    });
  const nextButton = (onclick: () => void) =>
    h('button', { class: 'qa-btn qa-btn-primary', type: 'button', onclick }, t('ui.quick.next'));
  const counter = h(
    'p',
    { class: 'qa-muted qa-small' },
    t('ui.quick.form.step', { n: step, of: QUICK_STEPS }),
  );
  const screen = (question: string, fields: readonly Node[], onNext: () => void): Screen => ({
    title: t('ui.quick.form.title'),
    body: h(
      'div',
      { class: 'qa-stack' },
      counter,
      h('h2', { class: 'qa-heading' }, question),
      ...fields,
    ),
    actions: [nextButton(onNext)],
  });
  /** A text answer that must not be empty; `missing` says so in place. */
  const words = (field: 'action' | 'anchor' | 'name', limit: number, hint: string) => {
    draft[field] ??= answers[field] ?? '';
    return {
      fields: wordsField(draft, field, limit, t(`ui.quick.q.${field}`), hint),
      onNext: () => {
        const value = (draft[field] ?? '').trim();
        if (value === '') {
          draft.missing = true;
          ctx.redraw();
          return;
        }
        next({ [field]: value });
      },
    };
  };

  if (step === 1) {
    const { fields, onNext } = words('action', QUICK_LIMITS.action, t('ui.quick.q.action.hint'));
    return screen(t('ui.quick.q.action'), fields, onNext);
  }
  if (step === 2) {
    const { fields, onNext } = words('anchor', QUICK_LIMITS.anchor, t('ui.quick.q.anchor.hint'));
    return screen(t('ui.quick.q.anchor'), fields, onNext);
  }
  if (step === 3) {
    draft.measure ??= answers.measure ?? 'minutes';
    draft.steps ??= answers.steps ?? [];
    return screen(t('ui.quick.q.measure'), measureFields(draft, ctx.redraw), () =>
      next({
        measure: draft.measure as QuickMeasure,
        ...(draft.measure === 'same' ? { steps: [] } : { steps: draft.steps ?? [] }),
      }),
    );
  }
  if (step === 4) {
    draft.schedule ??= answers.schedule ?? { type: 'daily' };
    return screen(t('ui.quick.q.schedule'), scheduleFields(draft, ctx.redraw), () =>
      next({ schedule: draft.schedule ?? { type: 'daily' } }),
    );
  }
  if (step === 5) {
    // What it builds is chosen when it starts (screen 3, with Change),
    // as for every journey.
    const { fields, onNext } = words('name', QUICK_LIMITS.name, t('ui.quick.q.name.hint'));
    return screen(t('ui.quick.q.name'), fields, onNext);
  }
  return review(ctx, answers as QuickForm, (journeyId) => {
    // The questions leave the stack: back from the start leads to Choose.
    ctx.back(QUICK_STEPS + 1);
    ctx.go({ name: 'start', journeyId, ...(anchorId ? { anchorId } : {}) });
  });
};
