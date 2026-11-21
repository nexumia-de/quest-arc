// Walks the built standalone app's two choices on the Data screen
// (#165): the language and light or dark. Each is chosen, seen at once,
// kept over a restart (offline) and given back to the device. The
// browser says English and a dark system, so every choice differs from
// what the device would give. Run after `npm run build`.
//
//   node e2e/walk-preferences.mjs [width height]
/* global document, innerWidth, getComputedStyle -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, launch, serve } from './serve.mjs';

const [width = 360, height = 720] = process.argv.slice(2).map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });

const site = await serve();
const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height },
  locale: 'en-GB',
  colorScheme: 'dark',
});
const page = await context.newPage();
page.on('pageerror', (error) => console.log('page error:', error.message));

const shot = (name) => page.screenshot({ path: join(OUT, `${width}-preferences-${name}.png`) });
const tab = (name) => page.locator('.app-tabs').getByRole('button', { name, exact: true }).click();
const open = async () => {
  await page.goto(site.url, { waitUntil: 'load' });
  await page.locator('.app-tabs').waitFor();
};
const look = () =>
  page.evaluate(() => ({
    lang: document.documentElement.lang,
    theme: document.documentElement.dataset.theme ?? '',
    background: getComputedStyle(document.body).backgroundColor,
    tabs: [...document.querySelectorAll('.app-tab')].map((b) => b.textContent).join(' '),
    wide: document.documentElement.scrollWidth > innerWidth,
    small: [...document.querySelectorAll('.app-view:not([hidden]) select')].filter(
      (field) => field.getBoundingClientRect().height < 44,
    ).length,
    kept: { ...localStorage },
  }));
const DARK = 'rgb(19, 19, 20)';
const LIGHT = 'rgb(248, 248, 247)';

try {
  await open();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await tab('Data');
  let seen = await look();
  expect(
    seen.lang === 'en' && seen.theme === '' && seen.background === DARK,
    'without a choice the app follows the device: English, dark',
  );
  expect(
    (await page.getByLabel('Language').inputValue()) === 'device' &&
      (await page.getByLabel('Appearance').inputValue()) === 'system',
    'both fields say so',
  );
  expect(!seen.wide && seen.small === 0, 'no horizontal scrolling, fields at least 44 px high');
  await shot('0-device');

  // German and light, against the device.
  await page.getByLabel('Language').selectOption('de');
  await page.getByRole('heading', { name: 'Daten' }).waitFor();
  seen = await look();
  expect(
    seen.lang === 'de' && seen.tabs === 'Heute Reise Daten',
    `the language changes in place (${seen.tabs})`,
  );
  await page.getByLabel('Darstellung').selectOption('light');
  seen = await look();
  expect(seen.theme === 'light' && seen.background === LIGHT, 'light, though the system is dark');
  expect(!seen.wide, 'no horizontal scrolling in German');
  await shot('1-german-light');
  await tab('Reise');
  await page.locator('.app-view').nth(1).getByText('Willkommen bei QuestArc').waitFor();
  expect(true, 'the journey’s screens speak German too');

  // Kept over a restart, without the network.
  await context.setOffline(true);
  await open();
  seen = await look();
  expect(
    seen.lang === 'de' &&
      seen.tabs === 'Heute Reise Daten' &&
      seen.theme === 'light' &&
      seen.background === LIGHT,
    'both choices are kept over a restart, offline',
  );
  await tab('Daten');
  await page.getByLabel('Darstellung').selectOption('dark');
  seen = await look();
  expect(seen.theme === 'dark' && seen.background === DARK, 'dark by choice');
  await shot('2-german-dark');

  // Back to the device.
  await page.getByLabel('Sprache').selectOption('device');
  await page.getByRole('heading', { name: 'Data' }).waitFor();
  await page.getByLabel('Appearance').selectOption('system');
  seen = await look();
  expect(
    seen.lang === 'en' && seen.theme === '' && Object.keys(seen.kept).length === 0,
    'following the device again leaves nothing stored',
  );
} catch (error) {
  await shot('failed').catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await site.close();
}
