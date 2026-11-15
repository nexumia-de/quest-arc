import {
  valleyLayout,
  type AnchorView,
  type Journey,
  type ValleyPlace as PlaceView,
} from '@questarc/engine';

import { t } from '../../shared/texts';
import type { ArtPack } from '../../shared/protocol';
import { buildState, hueOf } from '../journey/build';
import { anchorTitle } from '../journey/moment';
import { versionName, type Ladder } from '../ladder';

/**
 * The Valley as data (docs/behaviour.md screen 0, docs/journey-design.md
 * "The place piece"): what to draw and say for each place, from the
 * engine's `valley` view and `valleyLayout`. Nothing is laid out here:
 * every number comes from the engine's geometry. No DOM, so it runs in
 * Node's tests.
 */

/** One piece of the engine's layout (the type is the layout's, not the view's). */
type Piece = ReturnType<typeof valleyLayout>['places'][number];
export type Geometry = ReturnType<typeof valleyLayout>;

export interface PlaceModel {
  readonly view: PlaceView;
  readonly piece: Piece;
  /** The name shown: the user's name for the moment, else "After …" or "At …". */
  readonly title: string;
  /** The picture of the thing in its current version, if the ladder and its pictures are there. */
  readonly art?: string;
  readonly ladder?: Ladder;
  /** The place in words for screen readers: name, thing, version, sign. */
  readonly label: string;
  /** The tap area: the row of the place, from edge to edge, at least 44 high. */
  readonly hit: { x: number; y: number; width: number; height: number };
}

export interface ValleyModel {
  readonly geometry: Geometry;
  readonly places: readonly PlaceModel[];
}

/** The picture of `version` (from 1) of a ladder; the last for versions past it. */
export const versionArt = (ladder: Ladder, version: number): string | undefined =>
  ladder.versions[Math.min(Math.max(version, 1), ladder.versions.length) - 1]?.art;

/** A place in words: its name, its thing and version, the growing step and the sign. */
const wording = (
  place: PlaceView,
  title: string,
  ladder: Ladder | undefined,
  journey: Journey | undefined,
): string => {
  const thing = place.thing;
  const parts: string[] = [];
  if (thing && ladder) {
    const state = journey
      ? buildState({ ...thing, hue: '' }, journey)
      : { versions: thing.versions };
    parts.push(
      t('ui.valley.place', {
        name: title,
        thing: versionName(ladder, thing.version, state),
        version: thing.version,
        total: thing.versions,
      }),
    );
  } else parts.push(t('ui.valley.place.free', { name: title }));
  if (place.growing) parts.push(t('ui.valley.growing'));
  if (place.sign) parts.push(t(`ui.valley.sign.${place.sign}`));
  return parts.join(' ');
};

/** The height of the plain land where no moment stands yet. */
const EMPTY_HEIGHT = 240;

export const valleyModel = (
  places: readonly PlaceView[],
  anchors: readonly AnchorView[],
  journeys: readonly Journey[],
  pack: Pick<ArtPack, 'ladders'>,
): ValleyModel => {
  // Where nothing stands yet, plain land with the path, short enough to leave the words in view.
  const geometry = valleyLayout({
    sides: places.map((p) => p.side),
    ...(places.length === 0 ? { height: EMPTY_HEIGHT } : {}),
  });
  return {
    geometry,
    places: places.flatMap((view, i) => {
      const piece = geometry.places[i];
      if (!piece) return [];
      const anchor = anchors.find((a) => a.id === view.anchorId);
      const title = anchor ? anchorTitle(anchor, journeys) : view.name;
      const ladder = view.thing ? pack.ladders[view.thing.ladder] : undefined;
      const journey = view.thing && journeys.find((j) => j.id === view.thing?.journeyId);
      const art = ladder && view.thing ? versionArt(ladder, view.thing.version) : undefined;
      // The thing's row: slot and name side by side, from edge to edge.
      const top = Math.min(piece.slot.y, piece.name.y);
      const bottom = Math.max(piece.slot.y + piece.slot.height, piece.name.y + piece.name.height);
      const height = Math.max(44, bottom - top);
      return {
        view,
        piece,
        title,
        ...(art ? { art } : {}),
        ...(ladder ? { ladder } : {}),
        label: wording(view, title, ladder, journey),
        hit: {
          x: 0,
          y: Math.min(top, geometry.height - height),
          width: geometry.width,
          height,
        },
      };
    }),
  };
};

/**
 * Which things have a new version since the last draw, so they appear with
 * the calm animation; nothing on the first draw, in a fresh `before`.
 * Returns the versions to remember next.
 */
export const grownSince = (
  before: ReadonlyMap<string, number> | undefined,
  model: ValleyModel,
): { grown: ReadonlySet<string>; versions: Map<string, number> } => {
  const versions = new Map<string, number>();
  const grown = new Set<string>();
  for (const { view } of model.places) {
    if (!view.thing) continue;
    const key = `${view.anchorId}/${view.thing.runId}`;
    versions.set(key, view.thing.version);
    const was = before?.get(key);
    if (was !== undefined && view.thing.version > was) grown.add(view.anchorId);
  }
  return { grown, versions };
};

/** The hue of a place (palette), if it names one. */
export const placeHue = (place: PlaceView) => hueOf(place.hue);
