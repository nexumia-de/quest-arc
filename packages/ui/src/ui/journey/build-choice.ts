import { LADDERS, resolveBuild, type BuildChoice, type Journey } from '@questarc/engine';

import { t } from '../../shared/texts';
import { art } from '../art-store';
import { picture } from '../art';
import { h } from '../dom';
import { rowViewBox } from '../ladder';

/**
 * What you build (docs/behaviour.md screen 3a): the thing, each option with
 * a picture and its name in words. Only ladders that both the engine's
 * list and the pictures know are offered. The marker is always flowers
 * (#152), so there is no choice of what hangs. `choice` holds what the
 * user picked themselves; the rest follows the journey (engine
 * `resolveBuild`).
 */

/** The ladders a user can pick: in the engine's list and drawn. */
export const ladderNames = (): string[] =>
  Object.keys(LADDERS.ladders).filter((name) => art().ladders[name] !== undefined);

/** A new choice with `field` set. */
export const withChoice = (
  choice: BuildChoice,
  field: keyof BuildChoice,
  value: string,
): BuildChoice => ({ ...choice, [field]: value });

const small = (source: string | undefined, hue = art().palette['meadow'], viewBox?: string) => {
  const svg = picture(source ?? '', hue);
  if (viewBox) svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.removeAttribute('role');
  svg.removeAttribute('aria-label');
  svg.classList.add('qa-choice-art');
  return svg;
};

export const option = (
  group: string,
  value: string,
  checked: boolean,
  art: Node | null,
  label: string,
  note: string | undefined,
  onPick: (value: string) => void,
  disabled = false,
) =>
  h(
    'label',
    { class: `qa-option qa-choice${disabled ? ' qa-option-disabled' : ''}` },
    h('input', {
      type: 'radio',
      name: group,
      value,
      checked,
      disabled,
      onchange: () => onPick(value),
    }),
    art,
    h(
      'span',
      { class: 'qa-option-text' },
      h('span', { class: 'qa-option-title' }, label),
      note ? h('span', { class: 'qa-muted qa-small' }, note) : null,
    ),
  );

/** The choice of thing as a fieldset; `onChange` gets the new choice. */
export const buildChooser = (
  journey: Journey,
  choice: BuildChoice,
  onChange: (choice: BuildChoice) => void,
): Node => {
  const shown = resolveBuild(journey, choice);
  const suggested = resolveBuild(journey, undefined).ladder;
  const hue = art().palette[shown.hue];
  const pick = (field: keyof BuildChoice) => (value: string) =>
    onChange(withChoice(choice, field, value));
  return h(
    'div',
    { class: 'qa-stack' },
    h(
      'fieldset',
      { class: 'qa-fieldset' },
      h('legend', { class: 'qa-section-title' }, t('ui.build.thing')),
      h('p', { class: 'qa-muted qa-small' }, t('ui.build.one-thing')),
      ...ladderNames().map((name) => {
        const ladder = art().ladders[name];
        return option(
          'qa-ladder',
          name,
          name === shown.ladder,
          small(
            art().pictures[ladder?.versions[0]?.art ?? ''],
            hue,
            ladder ? rowViewBox(ladder) : undefined,
          ),
          ladder?.title ?? name,
          name === suggested ? t('ui.build.suggested') : undefined,
          pick('ladder'),
        );
      }),
    ),
  );
};

/** The build in words: the thing's name ("Home"). */
export const buildSummary = (journey: Journey, choice: BuildChoice): string => {
  const shown = resolveBuild(journey, choice);
  return art().ladders[shown.ladder]?.title ?? shown.ladder;
};

/** The first version, which stands from the start, as a small picture. */
export const firstVersion = (journey: Journey, choice: BuildChoice): Node => {
  const shown = resolveBuild(journey, choice);
  const ladder = art().ladders[shown.ladder];
  return small(
    art().pictures[ladder?.versions[0]?.art ?? ''],
    art().palette[shown.hue],
    ladder ? rowViewBox(ladder) : undefined,
  );
};
