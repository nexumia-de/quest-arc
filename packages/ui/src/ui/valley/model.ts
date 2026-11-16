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

type ThingView = PlaceView['things'][number];

/** One piece of the engine's layout (the type is the layout's, not the view's). */
type Piece = ReturnType<typeof valleyLayout>['places'][number];
export type Geometry = ReturnType<typeof valleyLayout>;

/** One thing as drawn at its place, in its own box (#151). */
export interface DrawnThing {
  readonly thing: ThingView;
  /** Its box in the layout: the slot for the first, behind it for the second and third. */
  readonly box: Piece['things'][number];
  /** The picture of its current version, if the ladder and its pictures are there. */
  readonly art?: string;
}

export interface PlaceModel {
  readonly view: PlaceView;
  /** The thing the place is about: the first, or the one of `options.runId`. */
  readonly thing?: ThingView;
  /** Every thing at the place, front to back (at most three; game rules §8). */
  readonly things: readonly DrawnThing[];
  readonly piece: Piece;
  /** The name shown: the user's name for the moment, else "After …" or "At …". */
  readonly title: string;
  /** The picture of the thing in its current version, if the ladder and its pictures are there. */
  readonly art?: string;
  readonly ladder?: Ladder;
  /** The place in words for screen readers: name, thing, version, sign. */
  readonly label: string;
  /**
   * The flowers in front of the growing thing, in its box and scene units,
   * while its journey grows: the thing of `options.runId`, or the place's
   * growing one.
   */
  readonly marker?: readonly (Placed & { readonly order: number })[];
  /** The run whose thing the marker stands at. */
  readonly markerRunId?: string;
  /** The tap area: the row of the place with every thing, from edge to edge, at least 44 high. */
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
  thing: ThingView | undefined,
  ladder: Ladder | undefined,
  journey: Journey | undefined,
): string => {
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
 * The scene's height in layout units (360 wide) for a window: about two
 * thirds of its height, so the growing card starts on the first screen
 * (#145), never below 480, the height at which the layout's checks hold
 * for six places and beyond (`valleyProblems`). The page is `pixels`
 * wide and the scene stands as wide as it, so units are scaled to it.
 */
export const MIN_SCENE_HEIGHT = 480;
export const sceneHeight = (windowHeight: number, pixels: number): number =>
  Math.max(MIN_SCENE_HEIGHT, Math.round(((2 / 3) * windowHeight * 360) / Math.max(pixels, 1)));

/**
 * The flowers of a growing thing (#152): each is a picture in the build's
 * box, so it is drawn in the thing's slot, in front of the thing.
 */
const markerPieces = (
  ladder: Ladder,
  slot: Piece['things'][number],
  thing: ThingView,
  journey: Journey | undefined,
): (Placed & { order: number })[] => {
  const state = buildState({ ...thing, hue: '' }, journey);
  return ladderScene(ladder, thing.version, state).pictures.flatMap((p) => {
    const order = (p as { order?: number }).order;
    if ((p as { slot?: string }).slot !== 'marker' || order === undefined) return [];
    return { art: p.art, order, x: slot.x, y: slot.y, width: slot.width, height: slot.height };
  });
};

export interface ModelOptions {
  /** The height of the scene (the layout's units, 360 wide); the layout's own where absent. */
  readonly height?: number;
  /**
   * One place's own page: the height is used as given, below the Valley's
   * minimum (which keeps the layout's checks for six places and beyond).
   */
  readonly own?: boolean;
  /** The journey whose page it is: the place is about its thing. */
  readonly runId?: string;
  /** Draw the flowers of a growing thing (the place's pages, not the Valley). */
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
  const height =
    places.length === 0
      ? EMPTY_HEIGHT
      : options.height === undefined || options.own
        ? options.height
        : Math.max(options.height, MIN_SCENE_HEIGHT);
  const geometry = valleyLayout({
    sides: places.map((p) => p.side),
    things: places.map((p) => p.things.length),
    ...(height === undefined ? {} : { height }),
  });
  return {
    geometry,
    places: places.flatMap((view, i) => {
      const piece = geometry.places[i];
      if (!piece) return [];
      const anchor = anchors.find((a) => a.id === view.anchorId);
      const title = anchor ? anchorTitle(anchor, journeys) : view.name;
      // Every thing is drawn in its own box (#151); the place is about the
      // one of the journey whose page it is, else the first.
      const drawnThings = view.things.flatMap((each, k): DrawnThing[] => {
        const box = piece.things[k];
        if (!box) return [];
        const own = pack.ladders[each.ladder];
        const picture = own ? versionArt(own, each.version) : undefined;
        return [{ thing: each, box, ...(picture ? { art: picture } : {}) }];
      });
      const thing = view.things.find((each) => each.runId === options.runId) ?? view.things[0];
      const ladder = thing ? pack.ladders[thing.ladder] : undefined;
      const journey = thing && journeys.find((j) => j.id === thing.journeyId);
      const art = ladder && thing ? versionArt(ladder, thing.version) : undefined;
      // The marker: of the journey whose page it is, else of the thing that grows.
      const grows =
        options.runId === undefined
          ? drawnThings.find((each) => each.thing.state === 'growing')
          : drawnThings.find((each) => each.thing.runId === options.runId);
      const growsLadder = grows && pack.ladders[grows.thing.ladder];
      const growsJourney = grows && journeys.find((j) => j.id === grows.thing.journeyId);
      const marker =
        options.marker && grows && growsLadder && grows.thing.state === 'growing'
          ? markerPieces(growsLadder, grows.box, grows.thing, growsJourney)
          : undefined;
      // The place's row: its things and its name side by side, from edge to
      // edge; the things behind reach up, but not into the row above.
      const boxes = [piece.slot, piece.name, ...drawnThings.map((each) => each.box)];
      const above = geometry.places[i - 1];
      const floor = above
        ? Math.max(above.slot.y + above.slot.height, above.name.y + above.name.height)
        : 0;
      const top = Math.max(
        Math.min(...boxes.map((b) => b.y)),
        Math.min(floor, piece.slot.y, piece.name.y),
      );
      const bottom = Math.max(...boxes.map((b) => b.y + b.height));
      const span = Math.max(44, bottom - top);
      return {
        view,
        piece,
        title,
        things: drawnThings,
        ...(art ? { art } : {}),
        ...(thing ? { thing } : {}),
        ...(marker && grows ? { marker, markerRunId: grows.thing.runId } : {}),
        ...(ladder ? { ladder } : {}),
        label: wording(view, title, thing, ladder, journey),
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
 * Which things (`anchorId/runId`) have a new version since the last draw,
 * so they appear with the calm animation; nothing on the first draw, in a
 * fresh `before`. Returns the versions to remember next.
 */
export const grownSince = (
  before: ReadonlyMap<string, number> | undefined,
  model: ValleyModel,
): { grown: ReadonlySet<string>; versions: Map<string, number> } => {
  const versions = new Map<string, number>();
  const grown = new Set<string>();
  for (const { view } of model.places)
    for (const thing of view.things) {
      const key = `${view.anchorId}/${thing.runId}`;
      versions.set(key, thing.version);
      const was = before?.get(key);
      if (was !== undefined && thing.version > was) grown.add(key);
    }
  return { grown, versions };
};

/** The hue of a place (palette), if it names one. */
export const placeHue = (place: PlaceView) => hueOf(place.hue);
