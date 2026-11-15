// Draws the Valley's place pieces (#127) for docs/journey-design.md, "The
// place piece": the scene from valleyLayout (packages/engine/src/
// valley-layout.ts, the same function the hosts use) with the committed
// builds of content/art in its slots, rendered with Playwright in Super
// Productivity's light and dark card colours:
//
//   node scripts/draw-valley.mjs
//
// (QUESTARC_CHROMIUM names a Chromium when Playwright's own is not installed,
// as for the app's walks.)
//
// It writes docs/screenshots/valley-<n>.png (360 × 720, light and dark side
// by side) and valley-desktop-<n>.png (the same scene drawn at 720 wide in
// a 1280 wide window) for one, three and six places. Nothing here is drawn
// by hand: change the rule's numbers in valley-layout.ts and run it again.
// Own work, CC BY-SA 4.0 like content/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { cubicPathData, valleyLayout } from '../packages/engine/src/valley-layout.ts';

const root = join(import.meta.dirname, '..');
const art = join(root, 'content', 'art');
const shots = join(root, 'docs', 'screenshots');
const palette = JSON.parse(readFileSync(join(art, 'palette.json'), 'utf8'));

/** Super Productivity's card and text colours (art-palette.ts, HOST_CARDS and HOST_TEXT). */
const THEMES = {
  light: { bg: '#ffffff', fg: '#2c2c2c', dark: 0 },
  dark: { bg: '#333333', fg: '#e6e6e6', dark: 1 },
};

/** Example days: the place's words, its hue (by position in the day) and its thing. */
const DAYS = {
  1: [{ name: 'After I pour my morning coffee', hue: 'meadow', build: 'home-3' }],
  3: [
    { name: 'After I pour my morning coffee', hue: 'sand', build: 'home-4' },
    { name: 'When I sit down at my desk', hue: 'meadow', build: 'garden-3' },
    { name: 'After brushing my teeth at night', hue: 'heather', build: 'well-3' },
  ],
  6: [
    { name: 'After I pour my morning coffee', hue: 'sand', build: 'home-4' },
    { name: 'When I sit down at my desk', hue: 'meadow', build: 'garden-3' },
    { name: 'After lunch', hue: 'water', build: 'lookout-2' },
    { name: 'When I get home', hue: 'moss', build: 'well-4' },
    { name: 'After dinner', hue: 'rust', build: 'garden-5' },
    { name: 'After brushing my teeth at night', hue: 'heather', build: 'home-2' },
  ],
};

const n1 = (v) => String(Math.round(v * 10) / 10);
const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** A build's shapes, without its svg element and title. */
const buildShapes = (name) =>
  readFileSync(join(art, `build-${name}.svg`), 'utf8')
    .replace(/^[\s\S]*?<\/title>/, '')
    .replace(/<\/svg>\s*$/, '');

/** The scene: ground, path, bays, things, names; all in the layout's units. */
const scene = (places, theme) => {
  const layout = valleyLayout({ sides: places.map((_, i) => (i % 2 === 0 ? 'right' : 'left')) });
  const { width, height } = layout;
  const hueOf = (p) => palette[p.hue][theme];
  // the ground: each place's tint over the middle of its piece, blending
  // into the next one around the joint
  const stops = layout.places.flatMap((place, i) => {
    const tint = `color-mix(in srgb, ${hueOf(places[i])} 16%, var(--bg))`;
    const { y, height: h } = place.piece;
    return [y + h * 0.3, y + h * 0.7].map(
      (at) => `<stop offset="${n1((100 * at) / height)}%" style="stop-color:${tint}"/>`,
    );
  });
  const things = layout.places.map((place, i) => {
    const { x, y, width: w, height: h } = place.slot;
    return `<svg class="thing" style="--hue:${hueOf(places[i])}" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 120 80">${buildShapes(places[i].build)}</svg>`;
  });
  const bays = layout.places.map(
    ({ bay }) =>
      `<ellipse class="bg" cx="${n1(bay.cx)}" cy="${n1(bay.cy)}" rx="${n1(bay.rx)}" ry="${n1(bay.ry)}"/>`,
  );
  const names = layout.places.map(({ name }, i) => {
    const style = [
      `left:${n1(name.x)}px`,
      `top:${n1(name.y)}px`,
      `width:${n1(name.width)}px`,
      `height:${n1(name.height)}px`,
      `font-size:${name.size}px`,
      `line-height:${name.lineHeight}px`,
      `justify-content:${name.align === 'right' ? 'flex-end' : 'flex-start'}`,
    ].join(';');
    return `<div class="name" style="${style}"><span>${escape(places[i].name)}</span></div>`;
  });
  return {
    width,
    height,
    html: `<div class="scene" style="width:${width}px;height:${height}px">
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">${stops.join('')}</linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#ground)"/>
<path class="way" d="${cubicPathData(layout.path)}" stroke-width="${layout.pathWidth}"/>
${bays.join('')}
${things.join('')}
</svg>${names.join('')}</div>`,
  };
};

const page = (body, theme) => `<!doctype html><html><head><meta charset="utf-8"><style>
:root { --bg: ${THEMES[theme].bg}; --fg: ${THEMES[theme].fg}; }
html, body { margin: 0; background: var(--bg); }
body { font-family: Roboto, 'Noto Sans', 'DejaVu Sans', sans-serif; }
.scene { position: relative; overflow: hidden; }
.scene > svg { display: block; }
.bg { fill: var(--bg); }
.way { fill: none; stroke: var(--bg); }
.thing .fg { fill: var(--fg); }
.thing .bg { fill: var(--bg); }
.thing .dim { fill: color-mix(in srgb, var(--fg) 30%, var(--bg)); }
.thing .accent { fill: var(--hue); }
.thing .tint { fill: color-mix(in srgb, var(--hue) 16%, var(--bg)); }
.thing .tint-strong { fill: color-mix(in srgb, var(--hue) 40%, var(--bg)); }
.name { position: absolute; color: var(--fg); display: flex; align-items: center; }
/* the block hugs the path; its lines start left, since Chromium drops the
   ellipsis of right-aligned clamped text */
.name span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; max-width: 100%; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch(
  process.env.QUESTARC_CHROMIUM ? { executablePath: process.env.QUESTARC_CHROMIUM } : {},
);
const shoot = async (html, width, height, file) => {
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await tab.setContent(html);
  await tab.screenshot({ path: join(shots, file), fullPage: true });
  await tab.close();
};

const GAP = 16;
for (const count of [1, 3, 6]) {
  const places = DAYS[count];
  // the phone: 360 × 720, light and dark side by side
  const phones = ['light', 'dark'].map((theme) => {
    const s = scene(places, theme);
    return `<iframe style="border:0;width:${s.width}px;height:${s.height}px;margin-right:${GAP}px" srcdoc="${escape(page(s.html, theme))}"></iframe>`;
  });
  await shoot(
    page(`<div style="display:flex">${phones.join('')}</div>`, 'light'),
    2 * 360 + GAP,
    720,
    `valley-${count}.png`,
  );
  // a desktop window, 1280 wide: the same scene drawn twice as large
  const desktops = ['light', 'dark'].map((theme) => {
    const s = scene(places, theme);
    const inner = `<div style="width:${s.width * 2}px;margin:0 auto;padding:24px 0"><div style="transform:scale(2);transform-origin:0 0;width:${s.width}px;height:${s.height * 2}px">${s.html}</div></div>`;
    return `<iframe style="border:0;width:1280px;height:${s.height * 2 + 48}px;margin-right:${GAP}px" srcdoc="${escape(page(inner, theme))}"></iframe>`;
  });
  await shoot(
    page(`<div style="display:flex">${desktops.join('')}</div>`, 'light'),
    2 * 1280 + GAP,
    720 * 2 + 48,
    `valley-desktop-${count}.png`,
  );
}
await browser.close();
