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
// a 1280 wide window) for one, three and six places, with signs and
// the lit lantern at some (#131); valley-place-<thing>.png (one place in each
// state at 360 × 720, light above, dark below) and valley-place-row.png
// (every ladder's first and fifth version in every state, the build's box at
// 60 × 40). Nothing here is drawn by hand: change the rule's numbers in
// valley-layout.ts or the place's pictures in draw-ladders.mjs and run it
// again.
// Own work, CC BY-SA 4.0 like content/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { cubicPathData, valleyLayout } from '../packages/engine/src/valley-layout.ts';

const root = join(import.meta.dirname, '..');
const art = join(root, 'content', 'art');
const shots = join(root, 'docs', 'screenshots');
const palette = JSON.parse(readFileSync(join(art, 'palette.json'), 'utf8'));
const placeArt = JSON.parse(readFileSync(join(art, 'place.json'), 'utf8'));

/** Super Productivity's card and text colours (art-palette.ts, HOST_CARDS and HOST_TEXT). */
const THEMES = {
  light: { bg: '#ffffff', fg: '#2c2c2c', dark: 0 },
  dark: { bg: '#333333', fg: '#e6e6e6', dark: 1 },
};

/** Example days: the place's words, its hue (by position in the day) and its thing. */
const DAYS = {
  1: [{ name: 'After I pour my morning coffee', hue: 'meadow', build: 'home-3' }],
  3: [
    {
      name: 'After I pour my morning coffee',
      hue: 'sand',
      build: 'home-4',
      sign: 'lantern',
    },
    { name: 'When I sit down at my desk', hue: 'meadow', build: 'garden-3' },
    { name: 'After brushing my teeth at night', hue: 'heather', build: 'well-3' },
  ],
  6: [
    {
      name: 'After I pour my morning coffee',
      hue: 'sand',
      build: 'home-5',
      sign: 'lantern',
    },
    { name: 'When I sit down at my desk', hue: 'meadow', build: 'garden-3' },
    { name: 'After lunch', hue: 'water', build: 'lookout-2' },
    { name: 'When I get home', hue: 'moss', build: 'well-5', sign: 'lantern' },
    { name: 'After dinner', hue: 'rust', build: 'garden-5' },
    { name: 'After brushing my teeth at night', hue: 'heather', build: 'home-2' },
  ],
};

const n1 = (v) => String(Math.round(v * 10) / 10);
const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** A picture's shapes, without its svg element and title. */
const shapesOf = (file) =>
  readFileSync(join(art, `${file}.svg`), 'utf8')
    .replace(/^[\s\S]*?<\/title>/, '')
    .replace(/<\/svg>\s*$/, '');
const buildShapes = (name) => shapesOf(`build-${name}`);
/** The picture of a place's sign, as the Valley's scene draws it (packages/ui/src/ui/valley/scene.ts). */
const placeSigns = (place) =>
  place.sign === 'lantern' ? [{ layer: 'lantern', art: placeArt.lantern[place.side] }] : [];
/** A sign drawn in the thing's box, reaching beyond it. */
const signSvg = (sign, box, hue) =>
  `<svg class="thing" style="--hue:${hue}" x="${n1(box.x)}" y="${n1(box.y)}" width="${n1(box.width)}" height="${n1(box.height)}" viewBox="0 0 120 80" overflow="visible">${shapesOf(sign.art)}</svg>`;

/** The scene: ground, path, bays, things, names; all in the layout's units. */
const scene = (places, theme) => {
  const layout = valleyLayout({
    sides: places.map((p, i) => p.side ?? (i % 2 === 0 ? 'right' : 'left')),
  });
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
  const signs = layout.places.map((place, i) => placeSigns({ ...places[i], side: place.side }));
  const things = layout.places.map((place, i) => {
    const { x, y, width: w, height: h } = place.slot;
    const hue = hueOf(places[i]);
    return [
      places[i].build
        ? `<svg class="thing" style="--hue:${hue}" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 120 80">${buildShapes(places[i].build)}</svg>`
        : '',
    ].join('');
  });
  const fronts = signs.flatMap((list, i) =>
    list
      .filter((sign) => sign.layer === 'lantern')
      .map((sign) => signSvg(sign, layout.places[i].slot, hueOf(places[i]))),
  );
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
${fronts.join('')}
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

// A place in each state (#131): plain and with its lantern lit; one place at
// 360 × 720, light above, dark below.
const STATES = [{ label: 'plain' }, { label: 'lantern', sign: 'lantern' }];
const NAME = 'After I pour my morning coffee';
for (const [build, hue, side] of [
  ['home-5', 'meadow', 'right'],
  ['garden-5', 'moss', 'left'],
]) {
  const rows = ['light', 'dark'].map((theme) =>
    STATES.map((state) => {
      const s = scene([{ name: NAME, hue, build, side, ...state }], theme);
      return `<iframe style="border:0;width:${s.width}px;height:${s.height}px;margin:0 ${GAP}px ${GAP}px 0" srcdoc="${escape(page(s.html, theme))}"></iframe>`;
    }).join(''),
  );
  await shoot(
    page(rows.map((r) => `<div style="display:flex">${r}</div>`).join(''), 'light'),
    STATES.length * (360 + GAP),
    2 * (720 + GAP),
    `valley-place-${build.split('-')[0]}.png`,
  );
}

// The same states for every thing small: the build's box at 60 × 40 with
// the room of its plot towards the path (7) and 6 below, light left, dark
// right.
const thumb = (build, state, theme) => {
  const hue = palette.meadow[theme];
  const signs = placeSigns({ ...state, side: 'right' });
  const box = { x: 7, y: 0, width: 60, height: 40 };
  const drawn = (layer) =>
    signs
      .filter((sign) => sign.layer === layer)
      .map((sign) => signSvg(sign, box, hue))
      .join('');
  return `<svg width="67" height="46" viewBox="0 0 67 46" style="margin:4px;background:color-mix(in srgb, ${hue} 16%, var(--bg))"><svg class="thing" style="--hue:${hue}" x="7" y="0" width="60" height="40" viewBox="0 0 120 80">${buildShapes(build)}</svg>${drawn('lantern')}</svg>`;
};
const THINGS = ['home', 'garden', 'well', 'lookout'].flatMap((l) => [`${l}-1`, `${l}-5`]);
const sheet = ['light', 'dark']
  .map(
    (theme) =>
      `<div style="background:var(--bg);padding:8px;--bg:${THEMES[theme].bg};--fg:${THEMES[theme].fg}">${THINGS.map(
        (build) =>
          `<div style="display:flex">${STATES.map((state) => thumb(build, state, theme)).join('')}</div>`,
      ).join('')}</div>`,
  )
  .join('');
await shoot(
  page(`<div style="display:flex">${sheet}</div>`, 'light'),
  2 * (STATES.length * 75 + 16),
  THINGS.length * 54 + 16,
  'valley-place-row.png',
);
await browser.close();
