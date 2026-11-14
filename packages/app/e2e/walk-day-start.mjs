// Walks the built standalone app (#93) with a day that starts at 04:00:
// set it on the Data screen, check that a tick at 01:30 counts for the
// day before and that the new day's task appears only after 04:00, and
// export. The export carries Super Productivity's whole default
// configuration with the day start in it; sp-import.mjs imports it into
// a real Super Productivity and sp-roundtrip.mjs reads Super
// Productivity's own export back. Writes dist/walk/backup-daystart-<width>.json
// and expect-daystart-<width>.json. Run after `npm run build`.
//
//   node e2e/walk-day-start.mjs [width height]
/* global indexedDB -- in functions the page runs */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, launch, serve } from './serve.mjs';

const [width = 360, height = 720] = process.argv.slice(2).map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });
const TASK = 'Getting up: drink a glass of water';
// The sections of Super Productivity's default configuration (store/global-config.ts).
const SECTIONS = 20;

const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
const page = await context.newPage();
await page.clock.install({ time: new Date('2026-03-02T08:00:00') });
page.on('pageerror', (error) => console.log('page error:', error.message));

const tab = (name) => page.locator('.app-tabs').getByRole('button', { name, exact: true }).click();
const journey = page.locator('.app-view').nth(1);
const habit = () => page.getByRole('checkbox', { name: TASK });
const isTicked = (ticked) => page.locator(`.app-habit[aria-checked=${ticked}]`).waitFor();
const open = async () => {
  await page.goto(site.url, { waitUntil: 'load' });
  await page.locator('.app-tabs').waitFor();
};
const stored = () =>
  page.evaluate(
    () =>
      new Promise((done, failed) => {
        const request = indexedDB.open('questarc');
        request.onerror = () => failed(request.error);
        request.onsuccess = () => {
          const get = request.result.transaction('dataset').objectStore('dataset').get('current');
          get.onsuccess = () => done(get.result);
          get.onerror = () => failed(get.error);
        };
      }),
  );

try {
  await open();

  // The day start, set before anything else.
  await tab('Data');
  await page.locator('input[type=time]').fill('04:00');
  let data;
  for (let i = 0; i < 20; i += 1) {
    data = await stored();
    if (data?.globalConfig?.misc?.startOfNextDayTime === '04:00') break;
    await page.waitForTimeout(100);
  }
  expect(
    Object.keys(data.globalConfig).length === SECTIONS &&
      data.globalConfig.misc.startOfNextDay === 4 &&
      data.globalConfig.misc.startOfNextDayTime === '04:00',
    `the day start is kept with all ${SECTIONS} sections of the default configuration`,
  );

  // Start the journey and create its task, as the first walk does.
  await tab('Today');
  await page.getByRole('button', { name: 'Open the Journey' }).click();
  await journey.getByRole('button', { name: 'Choose a journey' }).click();
  await journey.getByRole('button', { name: /A gentle morning/ }).click();
  await journey.getByRole('button', { name: 'Start this journey' }).click();
  await journey.locator('#qa-why').fill('Calmer mornings');
  await journey.getByRole('button', { name: 'Start', exact: true }).click();
  await journey.getByRole('button', { name: 'Create the task' }).click();
  await habit().waitFor();
  const [cfgId] = (await stored()).taskRepeatCfg.ids;
  const monday = `rpt_${cfgId}_2026-03-02`;

  // 01:30 on the 3rd still belongs to the 2nd: the same task, and a tick
  // counts for the day before.
  await page.clock.setSystemTime(new Date('2026-03-03T01:30:00'));
  await open();
  await tab('Today');
  await isTicked(false);
  expect(
    (await stored()).task.ids.join() === monday,
    'at 01:30 there is still the 2nd’s task only',
  );
  await habit().click();
  await isTicked(true);
  await page.locator('.app-message:not([hidden])').waitFor();
  const message = await page.locator('.app-message').innerText();
  expect(
    message.startsWith('Drink a glass of water: done. 1 of 5 days.'),
    `tick at 01:30: ${message}`,
  );
  data = await stored();
  expect(
    data.task.ids.length === 1 && data.task.entities[monday].isDone === true,
    'the tick at 01:30 is on the 2nd’s task',
  );

  // From 04:00 the 3rd has its own task.
  await page.clock.setSystemTime(new Date('2026-03-03T04:30:00'));
  await open();
  await tab('Today');
  await isTicked(false);
  data = await stored();
  expect(
    data.task.ids.length === 2 && data.task.ids.includes(`rpt_${cfgId}_2026-03-03`),
    'at 04:30 the 3rd’s task is made',
  );
  await tab('Journey');
  await journey.locator('.qa-growing, .qa-station-card').first().waitFor();
  if ((await journey.locator('.qa-growing').count()) > 0)
    await journey.locator('.qa-growing').click();
  const card = await journey.locator('.qa-station-card').innerText();
  expect(
    card.includes('1 of 5 days') && card.includes('Calmer mornings'),
    'the journey counts the tick',
  );

  // Export; the day start travels with it.
  await tab('Data');
  expect((await page.locator('input[type=time]').inputValue()) === '04:00', 'Data shows 04:00');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export a Backup' }).click(),
  ]);
  const file = join(OUT, `backup-daystart-${width}.json`);
  await download.saveAs(file);
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(
    backup.crossModelVersion === 4.5 &&
      Object.keys(backup.data.globalConfig).length === SECTIONS &&
      backup.data.globalConfig.misc.startOfNextDayTime === '04:00',
    'the export has the whole configuration with the day start',
  );
  writeFileSync(
    join(OUT, `expect-daystart-${width}.json`),
    JSON.stringify({
      journey: 'A gentle morning',
      card: '1 of 5 days',
      why: 'Calmer mornings',
      dayStart: '04:00',
      // the day the export was made, for the host's clock
      clock: '2026-03-03T08:30:00',
    }),
  );
} catch (error) {
  await page.screenshot({ path: join(OUT, `${width}-daystart-failed.png`) }).catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await site.close();
}
