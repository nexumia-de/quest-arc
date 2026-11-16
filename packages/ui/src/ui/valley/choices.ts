import {
  choosePlaceHue,
  choosePlaceKind,
  choosePlaceMarker,
  resolveBuild,
  choosePlaceSide,
  LADDERS,
  movePlace,
  withdrawPlace,
  type ValleyPlace,
} from '@questarc/engine';

import { t } from '../../shared/texts';
import { art } from '../art-store';
import { h } from '../dom';
import { kindChooser, markerChooser, option } from '../journey/build-choice';
import type { Context } from '../screen';
import { valleyModel } from './model';

/**
 * What the user places at a moment (docs/behaviour.md screen 0a, #114
 * decisions 3 and 10): where in the day, the side of the path and the
 * colour. Each change is one record through the engine's actions, written
 * at once; "Use the suggestion" gives all three back to the rules.
 */
/** The ladder the place's first journey names (what "Use the suggestion" gives back to the rule). */
const suggestedKind = (ctx: Context, place: ValleyPlace): string => {
  const first = place.things[0];
  const journey = first && ctx.state.journeys.find((j) => j.id === first.journeyId);
  return journey ? resolveBuild(journey, undefined).ladder : '';
};

export const placeChoices = (ctx: Context, place: ValleyPlace): HTMLElement => {
  const { view, journeys } = ctx.state;
  const id = place.anchorId;
  const at = view.valley.findIndex((p) => p.anchorId === id);
  const write = (records: Record<string, unknown>) => void ctx.write(records);
  const move = (direction: 'earlier' | 'later', label: string, free: boolean) =>
    h(
      'button',
      {
        class: 'qa-btn qa-btn-secondary',
        type: 'button',
        disabled: !free,
        onclick: () => write(movePlace(view, id, direction)),
      },
      label,
    );
  return h(
    'div',
    { class: 'qa-stack' },
    h(
      'section',
      { class: 'qa-fieldset' },
      h('h2', { class: 'qa-section-title' }, t('ui.place.day')),
      h(
        'ol',
        { class: 'qa-day' },
        ...valleyModel(view.valley, view.anchors, journeys, art()).places.map(
          ({ view: p, title }) =>
            h(
              'li',
              p.anchorId === id ? { class: 'qa-day-here', 'aria-current': 'true' } : {},
              title,
              p.anchorId === id
                ? h('span', { class: 'qa-muted qa-small' }, t('ui.place.here'))
                : null,
            ),
        ),
      ),
      move('earlier', t('ui.place.earlier'), at > 0),
      move('later', t('ui.place.later'), at >= 0 && at < view.valley.length - 1),
    ),
    h(
      'fieldset',
      { class: 'qa-fieldset' },
      h('legend', { class: 'qa-section-title' }, t('ui.place.side')),
      ...(['left', 'right'] as const).map((side) =>
        option(
          'qa-side',
          side,
          side === place.side,
          null,
          t(`ui.place.side.${side}`),
          undefined,
          () => write(choosePlaceSide(view, id, side)),
        ),
      ),
    ),
    place.things.length > 0
      ? kindChooser(place, suggestedKind(ctx, place), (ladder) =>
          write(choosePlaceKind(view, id, ladder)),
        )
      : null,
    markerChooser(place, (marker) => write(choosePlaceMarker(view, id, marker))),
    h(
      'fieldset',
      { class: 'qa-fieldset' },
      h('legend', { class: 'qa-section-title' }, t('ui.build.colour')),
      h(
        'div',
        { class: 'qa-swatches' },
        ...LADDERS.hues.map((name) => {
          const each = art().palette[name];
          const swatch = h('span', { class: 'qa-swatch', 'aria-hidden': 'true' });
          if (each) {
            swatch.style.setProperty('--qa-hue-light', each.light);
            swatch.style.setProperty('--qa-hue-dark', each.dark);
          }
          return option(
            'qa-hue',
            name,
            name === place.hue,
            swatch,
            each?.title ?? name,
            undefined,
            () => write(choosePlaceHue(view, id, name)),
          );
        }),
      ),
    ),
    Object.keys(place.chosen).length > 0
      ? h(
          'button',
          {
            class: 'qa-btn qa-btn-secondary',
            type: 'button',
            onclick: () => write(withdrawPlace(id)),
          },
          t('ui.place.suggestion'),
        )
      : null,
  ) as HTMLElement;
};
