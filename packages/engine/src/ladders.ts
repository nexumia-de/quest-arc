// Named imports, so the bundles keep only these fields and none of the
// pictures' coordinates (the plugin's view has a size limit).
import * as garden from '../../../content/art/garden.ladder.json';
import * as home from '../../../content/art/home.ladder.json';
import * as lookout from '../../../content/art/lookout.ladder.json';
import * as well from '../../../content/art/well.ladder.json';
import palette from '../../../content/art/palette.json';
import type { Journey } from './types/journey';

/**
 * What a journey can build (docs/game-rules.md §7), read from the picture
 * files in content/art/ that the art checker checks: each
 * `<name>.ladder.json` (its versions and default `hue`) and the hue names
 * of `palette.json`. The marker is the same for every ladder (flowers,
 * #152), so it is not in the list. One
 * list for the engine, the journey checker and both hosts; the engine uses
 * names and numbers only. A new ladder file gets one line in SOURCES (a
 * test checks that none is missing).
 */

interface LadderFile {
  readonly versions: readonly unknown[];
  readonly hue: string;
}

/** Only the fields the engine reads, named one by one so bundlers drop the rest. */
const SOURCES: Readonly<Record<string, LadderFile>> = {
  home: { versions: home.versions, hue: home.hue },
  garden: { versions: garden.versions, hue: garden.hue },
  well: { versions: well.versions, hue: well.hue },
  lookout: { versions: lookout.versions, hue: lookout.hue },
};

export interface Ladder {
  /** Number of whole versions drawn. */
  readonly versions: number;
  /** Default hue. */
  readonly hue: string;
}

export interface LadderList {
  readonly defaultLadder: string;
  readonly ladders: Readonly<Record<string, Ladder>>;
  readonly hues: readonly string[];
}

const listFromFiles = (): LadderList => ({
  defaultLadder: 'home',
  ladders: Object.fromEntries(
    Object.entries(SOURCES).map(([name, file]) => [
      name,
      { versions: file.versions.length, hue: file.hue },
    ]),
  ),
  hues: Object.keys(palette),
});

// Marked pure, so a bundle that does not use the list (the plugin's view,
// which has a size limit) leaves it out.
export const LADDERS: LadderList = /* @__PURE__ */ listFromFiles();

/**
 * The user's choices for a run (`build:<runId>`, docs/data-model.md §2). A
 * `marker` field of older records is ignored and kept as read (#152).
 */
export interface BuildChoice {
  readonly ladder?: string;
  readonly hue?: string;
}

/** The entry `name` of a list, if it is the list's own (no prototype keys). */
const entry = <T>(record: Readonly<Record<string, T>>, name: unknown): T | undefined =>
  typeof name === 'string' && Object.prototype.hasOwnProperty.call(record, name)
    ? record[name]
    : undefined;

/**
 * The ladder of a run: the user's choice, else the journey's, else the
 * default (the hue is the ladder's default, see below); unknown names are
 * skipped, so an older list never leaves a host without pictures.
 */
export const resolveBuild = (
  journey: Journey,
  choice: BuildChoice | undefined,
): { ladder: string; hue: string } => {
  const ladder =
    [choice?.ladder, journey.build?.ladder].find(
      (name): name is string => entry(LADDERS.ladders, name) !== undefined,
    ) ?? LADDERS.defaultLadder;
  const own = entry(LADDERS.ladders, ladder);
  // The hue belongs to the anchor's place (game rules §8), no longer to the run:
  // `build:<runId>.hue` is not read; this is the ladder's own default.
  return { ladder, hue: own?.hue ?? '' };
};
