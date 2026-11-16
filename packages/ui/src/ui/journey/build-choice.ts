import {
  LADDERS,
  MARKERS,
  resolveBuild,
  type BuildChoice,
  type Journey,
  type ValleyPlace,
} from '@questarc/engine';

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

/** The ladders as radio options: the picture of the first version and the name. */
const ladderOptions = (
  selected: string,
  suggested: string,
  hue: string,
  onPick: (value: string) => void,
): Node[] =>
  ladderNames().map((name) => {
    const ladder = art().ladders[name];
    return option(
      'qa-ladder',
      name,
      name === selected,
      small(
        art().pictures[ladder?.versions[0]?.art ?? ''],
        art().palette[hue],
        ladder ? rowViewBox(ladder) : undefined,
      ),
      ladder?.title ?? name,
      name === suggested ? t('ui.build.suggested') : undefined,
      onPick,
    );
  });

/** The choice of thing as a fieldset; `onChange` gets the new choice. */
export const buildChooser = (
  journey: Journey,
  choice: BuildChoice,
  onChange: (choice: BuildChoice) => void,
): Node => {
  const shown = resolveBuild(journey, choice);
  const suggested = resolveBuild(journey, undefined).ladder;
  return h(
    'div',
    { class: 'qa-stack' },
    h(
      'fieldset',
      { class: 'qa-fieldset' },
      h('legend', { class: 'qa-section-title' }, t('ui.build.thing')),
      h('p', { class: 'qa-muted qa-small' }, t('ui.build.one-thing')),
      ...ladderOptions(shown.ladder, suggested, shown.hue, (value) =>
        onChange(withChoice(choice, 'ladder', value)),
      ),
    ),
  );
};

/**
 * The kind of every thing at a place (#158), also after it has grown: the
 * same options as before the first version, written to the place's record.
 * `suggested` is the ladder the first journey names.
 */
export const kindChooser = (
  place: ValleyPlace,
  suggested: string,
  onPick: (ladder: string) => void,
): Node => {
  const shown = place.things[0]?.ladder ?? '';
  return h(
    'fieldset',
    { class: 'qa-fieldset' },
    h('legend', { class: 'qa-section-title' }, t('ui.build.thing')),
    h('p', { class: 'qa-muted qa-small' }, t('ui.place.kind.keeps')),
    ...ladderOptions(shown, suggested, place.hue, onPick),
  );
};

/**
 * What hangs at a place (#158): one option per marker kind that exists.
 * Hidden (null) while there is only one kind, so there is nothing to choose.
 */
export const markerChooser = (place: ValleyPlace, onPick: (marker: string) => void): Node | null =>
  MARKERS.kinds.length < 2
    ? null
    : h(
        'fieldset',
        { class: 'qa-fieldset' },
        h('legend', { class: 'qa-section-title' }, t('ui.place.marker')),
        ...MARKERS.kinds.map((kind) =>
          option(
            'qa-marker',
            kind,
            kind === place.marker,
            null,
            t(`ui.marker.${kind}`),
            kind === MARKERS.defaultMarker ? t('ui.place.marker.default') : undefined,
            onPick,
          ),
        ),
      );

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
