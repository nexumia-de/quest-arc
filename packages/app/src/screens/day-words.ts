import { language } from '@questarc/ui/shared/texts';

/**
 * A day (`YYYY-MM-DD`) in words, in the app's language: "Wednesday,
 * March 4". English keeps the device's own English (day before month or
 * after) and is plain English on a device of another language.
 */
export const dayInWords = (day: string): string => {
  const device = typeof navigator === 'undefined' ? '' : navigator.language;
  const locale = language() === 'de' ? 'de-DE' : device.startsWith('en') ? device : 'en';
  return new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};
