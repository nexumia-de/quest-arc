import { cubicPathData } from '@questarc/engine';

import { art } from '../art-store';
import { part } from '../art';
import { h } from '../dom';
import { grownSince, placeHue, type PlaceModel, type ValleyModel } from './model';

/**
 * The Valley's picture (docs/behaviour.md screen 0): the ground in the
 * places' hues, the path and the bays in the host's background, per place
 * its thing in its current version, and the names. All numbers come from
 * the engine's layout (`valleyLayout`, via `valleyModel`); nothing is
 * placed by hand here.
 *
 * The scene is built in **layers**, back to front, each a named slot with
 * one group per place: the place's sign (#131) fills `lantern`, and `slot(layer, i)` returns place i's
 * group in a layer. The names are HTML on top (`name`), then the places'
 * tap areas.
 */

export const LAYERS = ['ground', 'path', 'thing', 'marker', 'lantern'] as const;
export type Layer = (typeof LAYERS)[number];

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number> = {}): SVGElement => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  return el;
};
const n1 = (v: number): string => String(Math.round(v * 10) / 10);

/** What this view drew last (version per thing), to let a new version appear. Lives as long as the view. */
let drawn: Map<string, number> | undefined;
/** How many marker elements each growing thing showed at the last draw. */
let shown = new Map<string, number>();

/** Forget the last draw (tests, a new view). */
export const forgetValley = (): void => {
  drawn = undefined;
  shown = new Map();
};

/** The surface the scene stands on: the host's card, as for every picture. */
const SURFACE = 'var(--bg-lighter, #fff)';
/**
 * The path and the bays: the host's background in the light theme; in the
 * dark theme the place's `tint-strong`, so the bay reads as the path
 * widening and not as a hole in the lighter ground (#145).
 */
const WAY = (hue: string) =>
  `color-mix(in srgb, color-mix(in srgb, ${hue} 40%, ${SURFACE}) calc(var(--is-dark-theme, 0) * 100%), ${SURFACE})`;
/** A place's hue, light or dark as the theme is (as `.qa-art-hue` in style.css). */
const HUE =
  'color-mix(in srgb, var(--qa-hue-dark) calc(var(--is-dark-theme, 0) * 100%), var(--qa-hue-light))';

/** The place's hue as custom properties, for the colours above. */
const hueVars = (hue: { light: string; dark: string } | undefined): string =>
  `--qa-hue-light:${hue?.light ?? 'transparent'};--qa-hue-dark:${hue?.dark ?? 'transparent'}`;

export interface ValleyScene {
  readonly element: HTMLElement;
  /** Place `index`'s group in a layer, for what grows there. */
  readonly slot: (layer: Layer, index: number) => SVGElement | undefined;
}

/** Without `open` the scene is a picture only (the place's own pages), with no tap areas. */
export const valleyScene = (
  model: ValleyModel,
  open: ((place: PlaceModel) => void) | undefined,
  label: string,
): ValleyScene => {
  const { geometry } = model;
  const { width, height } = geometry;
  const { grown, versions } = grownSince(drawn, model);
  drawn = versions;

  const layers = new Map<Layer, SVGElement[]>();
  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'qa-valley-svg',
  });
  for (const layer of LAYERS) {
    const g = svgEl('g', { 'data-layer': layer });
    layers.set(
      layer,
      model.places.map((place) => {
        const slot = svgEl('g', { 'data-place': place.view.anchorId });
        g.append(slot);
        return slot;
      }),
    );
    svg.append(g);
  }
  const group = (layer: Layer) => svg.querySelector(`[data-layer="${layer}"]`) as SVGElement;

  // Ground: each place's hue lightly mixed into the surface, passing into the next one around the joint.
  const stops = model.places.flatMap(({ view, piece }) => {
    const hue = placeHue(view);
    const { y, height: span } = piece.piece;
    const tint = hue ? `color-mix(in srgb, ${HUE} 16%, ${SURFACE})` : SURFACE;
    return [y + span * 0.3, y + span * 0.7].map((at) => {
      const stop = svgEl('stop', { offset: `${n1((100 * at) / height)}%` });
      stop.setAttribute('style', `stop-color:${tint};${hueVars(hue)}`);
      return stop;
    });
  });
  const defs = svgEl('defs');
  const gradient = svgEl('linearGradient', { id: 'qa-valley-ground', x1: 0, y1: 0, x2: 0, y2: 1 });
  gradient.append(...stops);
  defs.append(gradient);
  svg.prepend(defs);
  group('ground').prepend(
    svgEl('rect', {
      width,
      height,
      // plain land where there is no place
      style: `fill:${stops.length > 0 ? 'url(#qa-valley-ground)' : SURFACE}`,
    }),
  );

  // Path and bays: one colour, along the path as the places' hues follow each other.
  const wayStops = model.places.flatMap(({ view, piece }) => {
    const hue = placeHue(view);
    const { y, height: span } = piece.piece;
    return [y + span * 0.2, y + span * 0.8].map((at) => {
      const stop = svgEl('stop', { offset: `${n1((100 * at) / height)}%` });
      stop.setAttribute('style', `stop-color:${hue ? WAY(HUE) : SURFACE};${hueVars(hue)}`);
      return stop;
    });
  });
  const wayGradient = svgEl('linearGradient', {
    id: 'qa-valley-way',
    gradientUnits: 'userSpaceOnUse',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: height,
  });
  wayGradient.append(...wayStops);
  defs.append(wayGradient);
  group('path').prepend(
    svgEl('path', {
      d: cubicPathData(geometry.path),
      class: 'qa-valley-way',
      'stroke-width': geometry.pathWidth,
      style: `stroke:${wayStops.length > 0 ? 'url(#qa-valley-way)' : SURFACE}`,
    }),
  );
  model.places.forEach(({ piece, view }, i) => {
    const { bay } = piece;
    const hue = placeHue(view);
    layers.get('path')?.[i]?.append(
      svgEl('ellipse', {
        cx: n1(bay.cx),
        cy: n1(bay.cy),
        rx: n1(bay.rx),
        ry: n1(bay.ry),
        class: 'qa-valley-bay',
        style: `fill:${hue ? WAY(HUE) : SURFACE};${hueVars(hue)}`,
      }),
    );
  });

  // The things, back to front, each in its own box: the second and third
  // stand behind the first (#151). Then the sign (#131): the lit lantern,
  // drawn in the first thing's box and reaching beyond it towards the path
  // (one picture per side), in front of the marker (docs/journey-design.md,
  // "The place piece" and "The sign of a place").
  model.places.forEach(({ piece, view, things }, i) => {
    const hue = placeHue(view);
    const slot = layers.get('thing')?.[i];
    for (const { thing, box, art: name } of [...things].reverse()) {
      const source = name && art().pictures[name];
      if (!source || !slot) continue;
      const g = svgEl(
        'g',
        grown.has(`${view.anchorId}/${thing.runId}`) ? { class: 'qa-grow' } : {},
      );
      g.append(part(source, box, hue));
      slot.append(g);
    }
    const lantern = view.sign === 'lantern' && art().pictures[`place-lantern-${view.side}`];
    if (lantern) layers.get('lantern')?.[i]?.append(part(lantern, piece.slot, hue));
  });

  // The marker in front of every thing, so nothing hides it, at the foot of
  // the growing thing; its new elements grow in, as on the journey screen.
  const before = shown;
  shown = new Map();
  model.places.forEach(({ marker, markerRunId, view }, i) => {
    const slot = layers.get('marker')?.[i];
    const key = `${view.anchorId}/${markerRunId ?? ''}`;
    if (!marker || !slot) return;
    shown.set(key, Math.max(0, ...marker.map((m) => m.order)));
    for (const m of marker) {
      const source = art().pictures[m.art];
      if (!source) continue;
      const g = svgEl('g', m.order > (before.get(key) ?? Infinity) ? { class: 'qa-grow' } : {});
      g.append(part(source, m, placeHue(view)));
      slot.append(g);
    }
  });

  // The names, in HTML over the picture; sizes follow the scene's width.
  const names = model.places.map(({ piece, title, view }) => {
    const { name } = piece;
    const style = [
      `left:${n1((100 * name.x) / width)}%`,
      `top:${n1((100 * name.y) / height)}%`,
      `width:${n1((100 * name.width) / width)}%`,
      `height:${n1((100 * name.height) / height)}%`,
      `font-size:calc(100cqw * ${name.size / width})`,
      `line-height:${n1((100 * name.lineHeight) / name.size)}%`,
      `justify-content:${name.align === 'right' ? 'flex-end' : 'flex-start'}`,
    ].join(';');
    return h(
      'div',
      {
        class: `qa-valley-name${view.growing ? ' qa-valley-growing' : ''}`,
        style,
        'aria-hidden': 'true',
      },
      h('span', {}, title),
    );
  });

  // The tap areas: one real button per place, the place in words.
  const taps = (open ? model.places : []).map((place) =>
    h('button', {
      type: 'button',
      class: 'qa-valley-place',
      style: [
        `left:${n1((100 * place.hit.x) / width)}%`,
        `top:${n1((100 * place.hit.y) / height)}%`,
        `width:${n1((100 * place.hit.width) / width)}%`,
        `height:${n1((100 * place.hit.height) / height)}%`,
      ].join(';'),
      'aria-label': place.label,
      onclick: () => open?.(place),
    }),
  );

  const element = h(
    'section',
    {
      class: 'qa-valley',
      'aria-label': label,
      style: `aspect-ratio:${width} / ${height}`,
    },
    svg,
    ...names,
    ...taps,
  ) as HTMLElement;
  return { element, slot: (layer, index) => layers.get(layer)?.[index] };
};
