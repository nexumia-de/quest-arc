import {
  valleyLayout,
  type AnchorView,
  type Journey,
  type ValleyPlace as PlaceView,
} from '@questarc/engine';

import { t } from '../../shared/texts';
import type { ArtPack } from '../../shared/protocol';
import type { Placed } from '../art';
import { buildState, hueOf } from '../journey/build';
import { anchorTitle } from '../journey/moment';
import { ladderScene, versionName, type Ladder } from '../ladder';

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
  /** The marker's pictures in front of the thing, in scene units, while its journey grows. */
  readonly marker?: readonly (Placed & { readonly order: number })[];
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
    const state = buildState({ ...thing, hue: '' }, journey);
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

/**
 * The marker's pictures (posts, cords, beads) of a growing thing, mapped
 * from the ladder's setting onto the thing's slot: the posts' span fills
 * the slot's width, the feet stand on its lower edge, so the marker stands
 * in front of the thing and never beyond the slot.
 */
const markerPieces = (
  ladder: Ladder,
  slot: Piece['slot'],
  thing: NonNullable<PlaceView['thing']>,
  journey: Journey | undefined,
): (Placed & { order: number })[] => {
  const all = ladder.pictures.filter((p) => p.slot === 'marker');
  const loose = all.filter((p) => p.slot === 'marker' && p.part !== 'cord');
  const left = Math.min(...loose.map((p) => p.x));
  const right = Math.max(...loose.map((p) => p.x + p.width));
  const base = Math.max(...loose.map((p) => p.y + p.height));
  const scale = slot.width / (right - left);
  const state = buildState({ ...thing, hue: '' }, journey);
  return ladderScene(ladder, thing.version, state).pictures.flatMap((p) => {
    const order = (p as { order?: number }).order;
    if ((p as { slot?: string }).slot !== 'marker' || order === undefined) return [];
    return {
      ...p,
      order,
      x: slot.x + (p.x - left) * scale,
      y: slot.y + slot.height + (p.y - base) * scale,
      width: p.width * scale,
      height: p.height * scale,
    };
  });
};

export interface ModelOptions {
  /** The height of the scene (one place fills it); the Valley's own where absent. */
  readonly height?: number;
  /** Draw the marker of a growing thing (the place's pages, not the Valley). */
  readonly marker?: boolean;
}

export const valleyModel = (
  places: readonly PlaceView[],
  anchors: readonly AnchorView[],
  journeys: readonly Journey[],
  pack: Pick<ArtPack, 'ladders'>,
  options: ModelOptions = {},
): ValleyModel => {
  // Where nothing stands yet, plain land with the path, short enough to leave the words in view.
  const height = options.height ?? (places.length === 0 ? EMPTY_HEIGHT : undefined);
  const geometry = valleyLayout({
    sides: places.map((p) => p.side),
    ...(height ? { height } : {}),
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
      const span = Math.max(44, bottom - top);
      const growing = options.marker && ladder && view.thing?.state === 'growing';
      return {
        view,
        piece,
        title,
        ...(art ? { art } : {}),
        ...(growing && view.thing
          ? { marker: markerPieces(ladder, piece.slot, view.thing, journey) }
          : {}),
        ...(ladder ? { ladder } : {}),
        label: wording(view, title, ladder, journey),
        hit: {
          x: 0,
          y: Math.min(top, geometry.height - span),
          width: geometry.width,
          height: span,
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
