import type { BuildView, Journey } from '@questarc/engine';

import { t } from '../../shared/texts';
import { art } from '../art-store';
import { picture, type Hue } from '../art';
import { h } from '../dom';
import { rowViewBox, versionName, type BuildState, type Ladder } from '../ladder';

/**
 * The build on the journey screen (docs/behaviour.md screen
 * 4, docs/journey-design.md "The journey screen with the build"): the
 * ladder's scene in the run's hue, the row of versions and one line of
 * state in words. Elements that are new since the last draw grow in.
 */

export const hueOf = (name: string, ladder?: Ladder): Hue | undefined =>
  art().palette[name] ?? (ladder ? art().palette[ladder.hue] : undefined);

/**
 * The state the scene is drawn in, from the engine's view and the journey's
 * names. The names were written for the journey's own ladder: on another
 * ladder (chosen when starting) the ladder's generic titles show (#115).
 */
export const buildState = (build: BuildView, journey?: Journey): BuildState => ({
  progress: build.markerProgress,
  ready: build.ready,
  versions: build.versions,
  names:
    journey && build.ladder === (journey.build?.ladder ?? 'home')
      ? journey.build?.names?.map((key) => (key ? t(key) : undefined))
      : undefined,
});

/** The row of versions: those standing small, the next as a plain step. */
export const versionRow = (
  ladder: Ladder,
  version: number,
  state: BuildState,
  hue: Hue | undefined,
  skipped: readonly number[] = [],
): HTMLElement => {
  const total = state.versions ?? ladder.versions.length;
  const items: Node[] = [];
  for (let v = 1; v <= Math.min(version, total); v += 1) {
    const file = ladder.versions[Math.min(v, ladder.versions.length) - 1]?.art ?? '';
    const svg = picture(art().pictures[file] ?? '', hue);
    svg.setAttribute('viewBox', rowViewBox(ladder));
    svg.setAttribute('aria-hidden', 'true');
    svg.removeAttribute('role');
    svg.removeAttribute('aria-label');
    // A version that stands for a skipped stage says so in words.
    const given = skipped.includes(v) ? t('ui.build.given') : undefined;
    const name = versionName(ladder, v, state);
    items.push(
      h(
        'li',
        { class: 'qa-version', 'aria-label': `${v}: ${given ? `${name}, ${given}` : name}` },
        svg,
        h('span', { 'aria-hidden': 'true' }, given ? `${v} · ${given}` : v),
      ),
    );
  }
  if (version < total) {
    items.push(
      h(
        'li',
        {
          class: 'qa-version qa-version-next',
          'aria-label': t('ui.build.next', { n: version + 1 }),
        },
        h('span', { class: 'qa-version-step', 'aria-hidden': 'true' }),
        h('span', { 'aria-hidden': 'true' }, version + 1),
      ),
    );
  }
  return h(
    'ol',
    { class: 'qa-versions', 'aria-label': t('ui.build.versions') },
    ...items,
  ) as HTMLElement;
};
