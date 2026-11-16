// Renders the PNG icons of the web app manifest from the SVGs in src/
// with Playwright's Chromium: icon.svg as is, icon-maskable.svg full
// bleed with the picture in the safe zone (also for iOS, which rounds the
// corners itself). The PNGs are committed, so the build needs no
// browser; run `npm run icons` after a change to either SVG
// (docs/pwa-release.md).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './e2e/serve.mjs';

const ICONS = [
  { svg: 'icon-maskable.svg', png: 'icon-180.png', size: 180 },
  { svg: 'icon.svg', png: 'icon-192.png', size: 192 },
  { svg: 'icon.svg', png: 'icon-512.png', size: 512 },
  { svg: 'icon-maskable.svg', png: 'icon-maskable-512.png', size: 512 },
];

const browser = await launch();
for (const { svg, png, size } of ICONS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const source = readFileSync(join('src', svg), 'utf8');
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  await page.locator('svg').screenshot({ path: join('src', png), omitBackground: true });
  await page.close();
  console.log(`${png} (${size} px) from ${svg}`);
}
await browser.close();
