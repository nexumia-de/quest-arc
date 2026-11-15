/**
 * The scene of a ladder (content/art/<name>.ladder.json, #42): one build
 * standing in its slot of its setting; while a stage runs flowers grow in
 * the thing's yard one at a time (#152), in bud, and open while the stage's
 * condition is met; after graduation the lantern. The
 * picture shows states, never a count: counts stay exact in the card. The
 * rules are in docs/journey-design.md, "Builds and ladders"; Day Planner
 * composes the same scene (pensum/ui/journey/art.py, `ladder_scene`).
 */
import { inLine as lowered, t } from '../shared/texts';
import type { Placed, Scene } from './art';

export interface LadderVersion {
  readonly art: string;
  readonly title: string;
}

type Place = Omit<Placed, 'art'> & { readonly art?: string };

export type LadderPlace =
  | (Placed & { readonly slot?: undefined })
  | (Place & { readonly slot: 'build' | 'lantern' })
  | (Placed & {
      /** A flower in the build's box (`marker-flower-<k>`, open: `…-open`). */
      readonly slot: 'marker';
      /** Its place in the order the flowers grow (1 … E). */
      readonly order: number;
    });

export interface Ladder {
  readonly title: string;
  /** The default hue of its setting's kind (palette.json). */
  readonly hue: string;
  /** Whether the setting is water (a build on water reaches its box's lower edge). */
  readonly water: boolean;
  readonly width: number;
  readonly height: number;
  /**
   * The part of every version the row of versions shows, zoomed
   * ([x, y, width, height] in build units, 3 : 2); the whole build if absent.
   */
  readonly row?: readonly number[];
  /** Where the setting's path meets every version, in build units. */
  readonly ways: readonly (readonly (readonly [number, number])[])[];
  readonly versions: readonly LadderVersion[];
  readonly pictures: readonly LadderPlace[];
}

/**
 * The marker while a stage runs: `progress` (0 … 1) is the best progress
 * reached in the stage's condition, so the marker never loses an element;
 * `ready` while the condition is met now (every element stands, on).
 */
export interface BuildState {
  readonly progress?: number;
  readonly ready?: boolean;
  /** After graduation: the lantern. */
  readonly graduated?: boolean;
  /**
   * The versions the journey uses (its stages + 1, from the engine); the
   * ladder's own number when left out. Versions past the ladder's last
   * picture are drawn with that picture.
   */
  readonly versions?: number;
  /** The journey's own names per version, in words; the ladder's titles where missing. */
  readonly names?: readonly (string | undefined)[];
}

/** The picture of `version` (from 1): the ladder's last for versions past it. */
const versionAt = (ladder: Ladder, version: number): LadderVersion | undefined =>
  ladder.versions[Math.min(Math.max(version, 1), ladder.versions.length) - 1];

/** How many versions the journey uses. */
const versionCount = (ladder: Ladder, state: BuildState): number =>
  state.versions ?? ladder.versions.length;

/**
 * A version's name: the journey's own, else the ladder's title; `inLine`
 * lowers the title for the middle of a sentence ("a stone bridge") where
 * the language does (`ui.grammar.lower`: German keeps "Trittsteine").
 */
export const versionName = (
  ladder: Ladder,
  version: number,
  state: BuildState = {},
  inLine = false,
): string => {
  const own = state.names?.[version - 1];
  if (own !== undefined && own !== '') return own;
  const title = versionAt(ladder, version)?.title ?? ladder.title;
  return inLine ? lowered(title) : title;
};

/** E: how many flowers the ladder's marker has. */
export const markerElements = (ladder: Ladder): number =>
  Math.max(0, ...ladder.pictures.map((p) => (p.slot === 'marker' ? p.order : 0)));

/** How many elements stand at `progress`: the first ceil(p × E). */
export const elementsShown = (ladder: Ladder, progress: number): number =>
  Math.max(0, Math.ceil(Math.min(Math.max(progress, 0), 1) * markerElements(ladder) - 1e-9));

/** The view box of a version in the row of versions. */
export const rowViewBox = (ladder: Ladder): string => (ladder.row ?? [0, 0, 120, 80]).join(' ');

/**
 * The state in words, as under the row of versions: only what stands
 * ("A hut stands"), never the next version (#155, docs/psychology.md).
 */
export const buildWords = (ladder: Ladder, version: number, state: BuildState = {}): string => {
  const now = versionName(ladder, version, state);
  // "A hut stands", "Stepping stones stand": the language says which names are one thing.
  const one = new RegExp(t('ui.grammar.singular')).test(now);
  return t(one ? 'ui.build.words.stands' : 'ui.build.words.stand', { name: now });
};

/** The flowers in numbers: how many stand of all (none after the last version). */
export const markerCount = (
  ladder: Ladder,
  version: number,
  state: BuildState = {},
): { readonly flowers: number; readonly shown: number } => {
  const flowers = markerElements(ladder);
  const last = version >= versionCount(ladder, state);
  const shown = last
    ? 0
    : state.ready === true
      ? flowers
      : elementsShown(ladder, state.progress ?? 0);
  return { flowers, shown };
};

/**
 * The build for screen readers (docs/journey-design.md, "The journey
 * screen with the build"): "A hut, version 3 of 5; 3 of 6 flowers, in
 * bud; not ready yet".
 */
export const buildLabel = (ladder: Ladder, version: number, state: BuildState): string => {
  const total = versionCount(ladder, state);
  const head = t('ui.build.label.head', {
    name: versionName(ladder, version, state),
    version,
    total,
  });
  if (version >= total) return t('ui.build.label.all', { head });
  const count = markerCount(ladder, version, state);
  if (count.shown === 0) return head;
  return t(state.ready === true ? 'ui.build.label.ready' : 'ui.build.label.not-ready', {
    head,
    shown: count.shown,
    flowers: count.flowers,
  });
};

/** What the screen drew last, to find what is new at the moment of the tick. */
export interface Drawn {
  readonly key: string;
  readonly version: number;
  readonly shown: number;
}

/**
 * What appears with this draw: flowers with an order above the last drawn
 * count, and the version when it grew. Nothing on a first draw or after
 * the run or ladder changed (the key).
 */
export const appearing = (
  before: Drawn | undefined,
  now: Drawn,
): { readonly version: boolean; readonly fromOrder: number } => {
  if (before === undefined || before.key !== now.key)
    return { version: false, fromOrder: Infinity };
  if (now.version > before.version) return { version: true, fromOrder: 1 };
  if (now.version < before.version) return { version: false, fromOrder: Infinity };
  return { version: false, fromOrder: now.shown > before.shown ? before.shown + 1 : Infinity };
};

/** The scene with `version` (from 1) standing and the flowers in `state`. */
export const ladderScene = (ladder: Ladder, version: number, state: BuildState = {}): Scene => {
  const standing = versionAt(ladder, version);
  // after the last version nothing is on its way: no marker
  const last = version >= versionCount(ladder, state);
  const ready = !last && state.ready === true;
  const shown = last
    ? 0
    : ready
      ? markerElements(ladder)
      : elementsShown(ladder, state.progress ?? 0);
  let title = buildWords(ladder, version, state);
  if (state.graduated === true) title += ', the lantern lit';
  const pictures: Placed[] = [];
  for (const place of ladder.pictures) {
    if (place.slot === undefined) pictures.push(place);
    else if (place.slot === 'build' && standing !== undefined)
      pictures.push({ ...place, art: standing.art });
    else if (place.slot === 'lantern' && state.graduated === true)
      pictures.push({ ...place, art: 'lantern' });
    else if (place.slot === 'marker' && place.order <= shown)
      pictures.push({ ...place, art: ready ? `${place.art}-open` : place.art });
  }
  return { title, width: ladder.width, height: ladder.height, pictures };
};
