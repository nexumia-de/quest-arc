import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The web app manifest as a browser needs it to install the app from
// GitHub Pages (docs/pwa-release.md); e2e/pwa.mjs asks a real browser.
const src = join(__dirname, '..', 'src');
const manifest = JSON.parse(readFileSync(join(src, 'manifest.webmanifest'), 'utf8')) as {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

/** Width and height from a PNG's header (IHDR). */
const pngSize = (file: string): string => {
  const bytes = readFileSync(join(src, file));
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};

describe('web app manifest', () => {
  it('names the app as decided', () => {
    expect(manifest.name).toBe('QuestArc: Habit Journeys');
    expect(manifest.short_name).toBe('QuestArc');
    expect(manifest.display).toBe('standalone');
  });

  it('works under any path, such as /quest-arc/ on GitHub Pages', () => {
    for (const url of [manifest.id, manifest.start_url, manifest.scope]) expect(url).toBe('./');
    for (const icon of manifest.icons) expect(icon.src).not.toMatch(/^\/|:/);
  });

  it('has PNG icons of 192 and 512 px and a maskable one, of the stated size', () => {
    const pngs = manifest.icons.filter((icon) => icon.type === 'image/png');
    expect(pngs.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ]);
    for (const icon of pngs) expect(pngSize(icon.src)).toBe(icon.sizes);
  });

  it('has the touch icon iOS reads from the page', () => {
    expect(readFileSync(join(src, 'index.html'), 'utf8')).toContain(
      '<link rel="apple-touch-icon" href="icon-180.png" />',
    );
    expect(pngSize('icon-180.png')).toBe('180x180');
  });
});
