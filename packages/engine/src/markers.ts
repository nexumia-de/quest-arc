import { LADDERS, type LadderList } from './ladders';

/**
 * What hangs: the marker kinds a place can show while its journey grows
 * (docs/game-rules.md §7, issue #158). The engine knows names only; the
 * hosts draw them. A ladder file lists the kinds it draws in `markers`;
 * the choice offers the kinds every ladder draws, the usual one (flowers)
 * first, so a changed kind of thing never leaves a marker undrawn. Flowers
 * are the default and the fallback for a name that is not offered. A lantern
 * means "runs by itself" and is never a marker. While only flowers exist the
 * hosts hide the choice.
 */
export const DEFAULT_MARKER = 'flowers';

/** The marker kinds every ladder of `list` draws, the default first. */
export const markerKinds = (list: LadderList = LADDERS): readonly string[] => {
  const each = Object.values(list.ladders).map((ladder) => ladder.markers);
  const shared = (each[0] ?? []).filter((kind) => each.every((kinds) => kinds.includes(kind)));
  return [DEFAULT_MARKER, ...shared.filter((kind) => kind !== DEFAULT_MARKER)];
};

export const MARKERS: { readonly defaultMarker: string; readonly kinds: readonly string[] } = {
  defaultMarker: DEFAULT_MARKER,
  kinds: /* @__PURE__ */ markerKinds(),
};

/** The marker of a place: the user's choice if it is an offered kind, else flowers. */
export const resolveMarker = (name: unknown, markers = MARKERS): string =>
  typeof name === 'string' && markers.kinds.includes(name) ? name : markers.defaultMarker;
