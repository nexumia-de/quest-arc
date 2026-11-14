import defaults from './sp-default-config.json';

/**
 * Super Productivity's default global configuration, as data
 * (`sp-default-config.json`, the `globalConfig` object as the app writes
 * it into the dataset). Super Productivity accepts a missing
 * `globalConfig` but not a partial one (20.0.0: 22 validation errors,
 * repaired from its defaults), so a dataset that sets anything in it, such
 * as the day start, carries all of it.
 *
 * Source: Super Productivity 19.3.1, commit 590178d7, file
 * src/app/features/config/default-global-config.const.ts
 * (https://github.com/super-productivity/super-productivity, MIT, ©
 * Johannes Millan). It is the same transcription that Pensum keeps in
 * pensum/store/sp-defaults.json (key `globalConfig`), copied by script.
 */

export type GlobalConfig = Readonly<Record<string, unknown>>;

export const defaultGlobalConfig = (): Record<string, unknown> => structuredClone(defaults);

/**
 * The configuration with every top-level section of the default that it
 * lacks added; what is present is never changed.
 */
export const completeGlobalConfig = (config: GlobalConfig | undefined): Record<string, unknown> => {
  const complete = defaultGlobalConfig();
  return { ...complete, ...config };
};
