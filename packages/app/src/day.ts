import { localDay } from '@questarc/ui/adapter/day';

import type { Dataset } from './store/dataset';
import { completeGlobalConfig } from './store/global-config';

/**
 * The logical day from the dataset's own setting, the one Super
 * Productivity keeps (`globalConfig.misc.startOfNextDayTime`, older
 * `startOfNextDay` in hours): a day that starts at 04:00 still counts a
 * tick at 01:30 for the day before (docs/game-rules.md §2).
 */

const HOUR_MS = 3_600_000;

export const dayStartMs = (data: Dataset): number => {
  const misc = data.globalConfig?.misc;
  const [h, m] = (misc?.startOfNextDayTime ?? '').split(':').map(Number);
  if (Number.isFinite(h) && Number.isFinite(m)) return ((h ?? 0) * 60 + (m ?? 0)) * 60_000;
  return typeof misc?.startOfNextDay === 'number' ? misc.startOfNextDay * HOUR_MS : 0;
};

/** The setting as `HH:MM`, for the time field. */
export const dayStartTime = (data: Dataset): string => {
  const minutes = Math.round(dayStartMs(data) / 60_000);
  return [Math.floor(minutes / 60), minutes % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

export const dayContext = (
  data: Dataset,
  now: Date,
): { todayStr: string; startOfNextDayDiffMs: number } => {
  const offset = dayStartMs(data);
  return { todayStr: localDay(new Date(now.getTime() - offset)), startOfNextDayDiffMs: offset };
};

/**
 * Sets the day start (`HH:MM`) in both fields Super Productivity keeps
 * (`startOfNextDayTime`, and `startOfNextDay` in whole hours). A dataset
 * from an older app version or an imported minimal file first gets the
 * top-level sections of the default configuration it lacks, because
 * Super Productivity does not accept a partial one; nothing present is
 * overwritten except these two fields.
 */
export const withDayStart = (data: Dataset, time: string): Dataset => {
  const [h = 0] = time.split(':').map(Number);
  const config = completeGlobalConfig(data.globalConfig);
  return {
    ...data,
    globalConfig: {
      ...config,
      misc: { ...(config.misc as object), startOfNextDay: h, startOfNextDayTime: time },
    },
  };
};
