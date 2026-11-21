/**
 * The two choices only the standalone app has to offer (#165): its
 * language and light or dark. The plugin takes both from Super
 * Productivity; the app has no such host, and an installed app cannot
 * be given `?lang=` by the user.
 *
 * They are kept in the app's own storage on this device
 * (`localStorage`), not in the dataset: the dataset is a backup of
 * Super Productivity's format that an import replaces and that travels
 * to other devices, and how one device looks is not part of it. Nothing
 * is sent anywhere. Following the device is the default and is stored
 * as no entry at all. Where the storage cannot be used (private
 * windows, blocked site data) the choice holds until the app closes.
 */

export const LANGUAGES = ['en', 'de'] as const;
export type LanguageChoice = 'device' | (typeof LANGUAGES)[number];

export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type Appearance = (typeof APPEARANCES)[number];

/** The languages' own names, shown the same in every language. */
export const LANGUAGE_NAMES: Readonly<Record<(typeof LANGUAGES)[number], string>> = {
  en: 'English',
  de: 'Deutsch',
};

type Kept = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Preferences {
  language(): LanguageChoice;
  appearance(): Appearance;
  setLanguage(choice: LanguageChoice): void;
  setAppearance(choice: Appearance): void;
}

const KEYS = { language: 'questarc.language', appearance: 'questarc.appearance' } as const;

const browserStorage = (): Kept | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

export const createPreferences = (storage: Kept | undefined = browserStorage()): Preferences => {
  // What was chosen while the app is open, also where nothing can be stored.
  const held: Partial<Record<keyof typeof KEYS, string>> = {};
  const read = <T extends string>(name: keyof typeof KEYS, known: readonly T[], fallback: T): T => {
    let value: string | null | undefined = held[name];
    if (value === undefined) {
      try {
        value = storage?.getItem(KEYS[name]);
      } catch {
        value = undefined;
      }
    }
    return known.includes(value as T) ? (value as T) : fallback;
  };
  const write = (name: keyof typeof KEYS, value: string, fallback: string): void => {
    held[name] = value;
    try {
      if (value === fallback) storage?.removeItem(KEYS[name]);
      else storage?.setItem(KEYS[name], value);
    } catch {
      // kept until the app closes
    }
  };
  return {
    language: () => read('language', ['device', ...LANGUAGES], 'device'),
    appearance: () => read('appearance', APPEARANCES, 'system'),
    setLanguage: (choice) => write('language', choice, 'device'),
    setAppearance: (choice) => write('appearance', choice, 'system'),
  };
};

/**
 * The locale the app speaks: the user's choice; without one `?lang=`
 * (a host that embeds the app says its own), else the device's.
 */
export const localeFor = (
  choice: LanguageChoice,
  query: string | null | undefined,
  device: string | undefined,
): string | undefined => (choice === 'device' ? (query ?? device) : choice);

/**
 * Light or dark by choice: `data-theme` on the page's root, which
 * app.css answers with the theme's variables (build.mjs); without the
 * attribute the page follows the system.
 */
export const applyAppearance = (
  root: { dataset: Record<string, string | undefined> },
  choice: Appearance,
): void => {
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
};
