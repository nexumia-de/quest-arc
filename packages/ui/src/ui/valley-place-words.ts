/**
 * A place's sign in words, for screen readers (docs/journey-design.md,
 * "The signs of a place").
 */
import { t } from '../shared/texts';
import type { PlaceSigns } from './valley-place';

/** "flowers grow at its foot", "… and its lantern is lit"; empty without a sign. */
export const placeSignWords = (place: PlaceSigns): string =>
  place.sign === 'flowers'
    ? t('ui.place.flowers')
    : place.sign === 'lantern'
      ? t('ui.place.lantern')
      : '';
