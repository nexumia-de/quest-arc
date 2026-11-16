/**
 * What hangs: the marker kinds a place can show while its journey grows
 * (docs/game-rules.md §7, issue #158). The engine knows names only; the
 * hosts draw them. Flowers are the default and the fallback for a name
 * this list does not have. A lantern means "runs by itself" and is never
 * a marker, so no marker is a light or a flag. New kinds are drawn
 * in their own art issue and added here when their pictures exist.
 */
export const MARKERS: { readonly defaultMarker: string; readonly kinds: readonly string[] } = {
  defaultMarker: 'flowers',
  kinds: ['flowers'],
};

/** The marker of a place: the user's choice if it is a known kind, else flowers. */
export const resolveMarker = (name: unknown, markers = MARKERS): string =>
  typeof name === 'string' && markers.kinds.includes(name) ? name : markers.defaultMarker;
