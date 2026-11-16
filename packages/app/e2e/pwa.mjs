// Checks the built app as a PWA the way GitHub Pages serves it, under
// /quest-arc/ (docs/pwa-release.md): the browser reads the manifest
// without errors and finds the app installable, the service worker runs
// with the app's path as its scope and keeps every file of the build in
// one versioned cache, a reload offline starts the app, and a new build
// on the server replaces the old cache on the next start online. Needs
// `npm run build` first; QUESTARC_CHROMIUM as for the walk.
/* global caches -- read in the page (page.evaluate) */
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, launchProfile, serve } from './serve.mjs';

const BASE = '/quest-arc/';
const READY = () => performance.getEntriesByName('questarc-ready').length > 0;
// A copy of the build, so the update below can change it on the "server".
const work = mkdtempSync(join(tmpdir(), 'questarc-pwa-'));
const dir = join(work, 'site');
cpSync(resolve('dist', 'app'), dir, { recursive: true });
const site = await serve(dir, { base: BASE });
const profile = join(work, 'profile');
const context = await launchProfile(profile, { viewport: { width: 360, height: 720 } });

try {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(site.url);
  await page.waitForFunction(READY);
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active ? registration.scope : '';
  });
  expect(scope === site.url, `the service worker runs with the app's path as scope (${scope})`);

  const cdp = await context.newCDPSession(page);
  const manifest = await cdp.send('Page.getAppManifest');
  expect(manifest.url === `${site.url}manifest.webmanifest`, 'the page links the manifest');
  expect(manifest.errors.length === 0, `the manifest has no errors (${manifest.errors.length})`);
  const parsed = JSON.parse(manifest.data);
  expect(parsed.name === 'QuestArc: Habit Journeys', 'the manifest names the app');
  expect(parsed.short_name === 'QuestArc', 'the home screen says QuestArc');
  const icons = parsed.icons.map((icon) => `${icon.sizes} ${icon.purpose}`);
  for (const icon of ['192x192 any', '512x512 any', '512x512 maskable']) {
    expect(icons.includes(icon), `the manifest has a ${icon} icon`);
  }
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  const errors = installabilityErrors.map((error) => error.errorId);
  expect(errors.length === 0, `the browser finds the app installable (${errors.join(', ')})`);

  // Every file of the build is in one cache named with a version.
  const built = readdirSync(dir).filter((file) => file !== 'sw.js');
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names[0]);
    const keys = await cache.keys();
    return { names, urls: keys.map((request) => request.url) };
  });
  expect(
    cached.names.length === 1 && /^questarc-[\d.]+-[0-9a-f]{16}$/.test(cached.names[0]),
    `one versioned cache (${cached.names.join(', ')})`,
  );
  const missing = built.filter((file) => !cached.urls.includes(`${site.url}${file}`));
  expect(missing.length === 0, `every built file is cached (${built.length}, missing: ${missing})`);

  // Offline from here on: the reload gets everything from the cache.
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(READY);
  expect(await page.locator('.app-tabs').isVisible(), 'the app starts offline');
  await page.goto(`${site.url}?lang=de`);
  await page.waitForFunction(READY);
  expect(await page.locator('.app-tabs').isVisible(), 'the start page with a query, offline');

  // A new build on the server: another style and another cache name.
  await context.setOffline(false);
  const oldCache = cached.names[0];
  const newCache = oldCache.replace(/[0-9a-f]{16}$/, '0123456789abcdef');
  const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
  writeFileSync(join(dir, 'sw.js'), sw.replaceAll(oldCache, newCache));
  writeFileSync(join(dir, 'app.css'), `${readFileSync(join(dir, 'app.css'), 'utf8')}/*new*/`);
  await page.reload({ waitUntil: 'load' });
  let keys = [];
  for (let tries = 0; tries < 50 && keys.join() !== newCache; tries += 1) {
    await page.waitForTimeout(200);
    keys = await page.evaluate(() => caches.keys());
  }
  expect(keys.join() === newCache, `the new build replaces the old cache (${keys})`);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(READY);
  const style = await page.evaluate(async () => (await caches.match('app.css'))?.text() ?? '');
  expect(
    style.endsWith('/*new*/'),
    'the new cache holds the new build, not a copy from the HTTP cache',
  );
} finally {
  await context.close();
  await site.close();
  rmSync(work, { recursive: true, force: true });
}
