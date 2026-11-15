/**
 * A place's sign and surroundings in words, for screen readers
 * (docs/journey-design.md, "Signs and surroundings of a place").
 */
import { t } from '../shared/texts';
import type { PlaceArt, PlaceSigns } from './valley-place';

/**
 * The place's sign and surroundings in words, for screen readers ("plants
 * grow around it; around it: a low fence and a tree"); empty when it has
 * neither.
 */
export const placeSignWords = (art: PlaceArt, place: PlaceSigns): string => {
  const parts: string[] = [];
  if (place.sign === 'plants') parts.push(t('ui.place.plants'));
  if (place.sign === 'lantern') parts.push(t('ui.place.lantern'));
  const steps = Math.max(0, Math.min(place.surroundings, art.surroundings.length));
  if (steps > 0) parts.push(t(`ui.place.surroundings.${steps}`));
  return parts.join('; ');
};
