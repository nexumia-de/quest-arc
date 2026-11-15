import type { RunView, ValleyPlace } from '@questarc/engine';

import { t } from '../../shared/texts';
import { art } from '../art-store';
import { h, icon, ICONS } from '../dom';
import { buildState, hueOf, versionRow } from '../journey/build';
import { buildWords } from '../ladder';
import type { Context } from '../screen';
import { valleyModel, type PlaceModel } from './model';
import { valleyScene } from './scene';

/**
 * The place piece drawn large (docs/behaviour.md, the place and the journey,
 * docs/journey-design.md "The place piece"): one place of the Valley's
 * layout as the setting of its pages, in the place's hue, the thing in its
 * version with the marker in front while its journey grows.
 */

/** The scene's height: one place fills it. */
const HEIGHT = 230;

/**
 * The place a run stands at: the place of its anchor, or, for a run from
 * before anchors, one made from its own build (nothing is stored for it).
 */
export const placeOfRun = (ctx: Context, run: RunView): ValleyPlace => {
  const { valley } = ctx.state.view;
  const found =
    valley.find((p) => p.thing?.runId === run.runId) ??
    valley.find((p) => p.anchorId === run.anchor?.id);
  if (found) return found;
  const { build } = run;
  return {
    anchorId: run.anchor?.id ?? '',
    name: '',
    side: 'right',
    hue: art().ladders[build.ladder]?.hue ?? '',
    thing: { ...build, runId: run.runId, journeyId: run.journeyId, state: 'growing' },
    surroundings: 0,
    growing: true,
    chosen: {},
  };
};

/** The large piece of one place; `label` names it for screen readers (else the place in words). */
export const placePiece = (ctx: Context, place: ValleyPlace, label?: string): HTMLElement => {
  const { anchors } = ctx.state.view;
  const model = valleyModel([place], anchors, ctx.state.journeys, art(), {
    height: HEIGHT,
    own: true,
    marker: true,
  });
  const only: PlaceModel | undefined = model.places[0];
  const scene = valleyScene(model, undefined, label ?? only?.label ?? t('ui.valley.label'));
  // The pencil opens "Change this moment"; a run from before anchors has no moment yet.
  return h(
    'div',
    { class: 'qa-place-piece' },
    scene.element,
    place.anchorId
      ? h(
          'button',
          {
            class: 'qa-icon-btn qa-place-edit',
            type: 'button',
            title: t('ui.moment.change'),
            'aria-label': t('ui.moment.change'),
            onclick: () => ctx.go({ name: 'moment', anchorId: place.anchorId }),
          },
          icon(ICONS.edit),
        )
      : null,
  ) as HTMLElement;
};

/**
 * The upper part of a place's pages: the piece, and for the journey that
 * builds the place's thing (or at rest) the row of versions that stand and
 * one line of state. A further journey shows the piece only.
 */
export const placeSection = (
  ctx: Context,
  place: ValleyPlace,
  label?: string,
  showRow = true,
): HTMLElement => {
  const { thing } = place;
  const ladder = thing && art().ladders[thing.ladder];
  const journey = thing && ctx.state.journeys.find((j) => j.id === thing.journeyId);
  const state = thing && buildState({ ...thing, hue: '' }, journey);
  return h(
    'section',
    { class: 'qa-build', 'aria-label': t('ui.build.title') },
    h('div', { class: 'qa-build-scene' }, placePiece(ctx, place, label)),
    ...(showRow && thing && ladder && state
      ? [
          versionRow(ladder, thing.version, state, hueOf(place.hue, ladder), thing.skipped),
          h('p', { class: 'qa-build-state' }, buildWords(ladder, thing.version, state)),
        ]
      : []),
  ) as HTMLElement;
};
