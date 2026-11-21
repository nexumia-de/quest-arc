import { describe, expect, it } from 'vitest';

import { applyAppearance, createPreferences, localeFor } from '../src/preferences';

// Language and light or dark (#165): kept in the app's own storage,
// following the device unless the user chose. The screen is walked in a
// browser (e2e/walk-preferences.mjs).
const storage = (start: Record<string, string> = {}) => {
  const map = new Map(Object.entries(start));
  return {
    get kept() {
      return Object.fromEntries(map);
    },
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
};
const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('the app’s own choices', () => {
  it('follows the device and the system until the user chooses', () => {
    const preferences = createPreferences(storage());
    expect(preferences.language()).toBe('device');
    expect(preferences.appearance()).toBe('system');
  });

  it('keeps a choice across restarts', () => {
    const kept = storage();
    const first = createPreferences(kept);
    first.setLanguage('de');
    first.setAppearance('dark');
    expect(kept.kept).toEqual({ 'questarc.language': 'de', 'questarc.appearance': 'dark' });
    const again = createPreferences(kept);
    expect(again.language()).toBe('de');
    expect(again.appearance()).toBe('dark');
  });

  it('stores following the device as no entry', () => {
    const kept = storage({ 'questarc.language': 'de', 'questarc.appearance': 'light' });
    const preferences = createPreferences(kept);
    preferences.setLanguage('device');
    preferences.setAppearance('system');
    expect(kept.kept).toEqual({});
    expect(preferences.language()).toBe('device');
    expect(preferences.appearance()).toBe('system');
  });

  it('reads an unknown stored value as no choice', () => {
    const preferences = createPreferences(
      storage({ 'questarc.language': 'fr', 'questarc.appearance': 'sepia' }),
    );
    expect(preferences.language()).toBe('device');
    expect(preferences.appearance()).toBe('system');
  });

  it('holds a choice while the app is open where nothing can be stored', () => {
    for (const none of [broken, undefined]) {
      const preferences = createPreferences(none);
      expect(preferences.language()).toBe('device');
      expect(() => preferences.setLanguage('de')).not.toThrow();
      preferences.setAppearance('light');
      expect(preferences.language()).toBe('de');
      expect(preferences.appearance()).toBe('light');
    }
  });

  it('speaks the chosen language before ?lang= and the device', () => {
    expect(localeFor('de', 'en', 'en-GB')).toBe('de');
    expect(localeFor('en', null, 'de-DE')).toBe('en');
    expect(localeFor('device', 'de', 'en-GB')).toBe('de');
    expect(localeFor('device', null, 'de-AT')).toBe('de-AT');
    expect(localeFor('device', null, undefined)).toBeUndefined();
  });

  it('marks the page only for a chosen appearance', () => {
    const root = { dataset: {} as Record<string, string | undefined> };
    applyAppearance(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
    applyAppearance(root, 'light');
    expect(root.dataset.theme).toBe('light');
    applyAppearance(root, 'system');
    expect('theme' in root.dataset).toBe(false);
  });
});
