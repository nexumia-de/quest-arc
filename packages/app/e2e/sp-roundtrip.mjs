// The round trip back (#91, step 3): reads Super Productivity's own
// export of the app's backup (sp-import.mjs saves it as
// dist/walk/sp-export-<name>.json) into the standalone app, in a fresh
// browser profile, through its Data screen, and checks that
//   - the app takes it and shows the same journey state as the walk did
//     (expect-<name>.json), and the day start, if the walk set one;
//   - Today shows the task;
//   - exporting again gives a dataset whose slices the app does not own
//     are deep-equal to Super Productivity's, and whose configuration
//     is untouched.
// Prints counts and slice names, never titles.
//
//   node e2e/sp-roundtrip.mjs [sp-export-<name>.json]
//
// Run `npm run build` and `npm run e2e -w @questarc/app` first.
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { expect, launch, serve } from './serve.mjs';

const file = resolve(process.argv[2] ?? resolve('dist', 'walk', 'sp-export-360.json'));
const name = basename(file)
  .replace(/^sp-export-/, '')
  .replace(/\.json$/, '');
const expected = JSON.parse(readFileSync(resolve(dirname(file), `expect-${name}.json`), 'utf8'));
const exported = JSON.parse(readFileSync(file, 'utf8'));
const TASK = 'Getting up: drink a glass of water';
/** The slices the app writes (store/dataset.ts); every other one it only keeps. */
const OWNED = ['task', 'project', 'tag', 'taskRepeatCfg', 'pluginUserData', 'globalConfig'];

const sp = exported.data ?? exported;
console.log(
  `Super Productivity's export: crossModelVersion ${exported.crossModelVersion}, ` +
    `${Object.keys(sp).length} slices, ${sp.task?.ids?.length} tasks, ` +
    `${sp.taskRepeatCfg?.ids?.length} repeat configs`,
);

const site = await serve();
const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 720 },
  acceptDownloads: true,
});
const page = await context.newPage();
await page.clock.install({ time: new Date(expected.clock ?? '2026-03-12T08:30:00') });
page.on('pageerror', (error) => console.log('page error:', error.message));
const tab = (name) => page.locator('.app-tabs').getByRole('button', { name, exact: true }).click();
const journey = page.locator('.app-view').nth(1);

try {
  await page.goto(site.url, { waitUntil: 'load' });
  await page.locator('.app-tabs').waitFor();
  await tab('Data');
  await page.locator('input[type=file]').setInputFiles(file);
  const message = page.locator('.app-message:not([hidden])', { hasText: 'Backup imported.' });
  const refused = await message
    .waitFor({ timeout: 10_000 })
    .then(() => false)
    .catch(() => true);
  expect(
    !refused,
    `the app takes Super Productivity's export (${await page.locator('.app-message').innerText()})`,
  );

  if (expected.dayStart) {
    expect(
      (await page.locator('input[type=time]').inputValue()) === expected.dayStart,
      `Data shows the day start ${expected.dayStart}`,
    );
  }
  await tab('Today');
  await page.getByRole('checkbox', { name: TASK }).waitFor({ timeout: 10_000 });
  expect(true, 'Today shows the task');

  await tab('Journey');
  await journey.locator('.qa-growing, .qa-station-card').first().waitFor();
  if ((await journey.locator('.qa-growing').count()) > 0)
    await journey.locator('.qa-growing').click();
  const title = await journey.locator('.qa-title').innerText();
  const card = await journey.locator('.qa-station-card').innerText();
  expect(title === expected.journey, `the app shows the journey (${title})`);
  expect(
    card.includes(expected.card) && card.includes(expected.why),
    `the app shows the same state (${expected.card})`,
  );

  // Export again and compare with what Super Productivity exported.
  await tab('Data');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export a Backup' }).click(),
  ]);
  const again = resolve('dist', 'walk', `roundtrip-${name}.json`);
  await download.saveAs(again);
  const back = JSON.parse(readFileSync(again, 'utf8'));
  expect(back.crossModelVersion === exported.crossModelVersion, 'the data model version is kept');
  const kept = Object.keys(sp).filter((slice) => !OWNED.includes(slice));
  const changed = kept.filter(
    (slice) => JSON.stringify(back.data[slice]) !== JSON.stringify(sp[slice]),
  );
  const lost = Object.keys(back.data).filter((slice) => !(slice in sp) && !OWNED.includes(slice));
  expect(
    changed.length === 0 && lost.length === 0,
    `${kept.length} slices the app does not own are equal to Super Productivity's (changed: ${changed.join(', ') || 'none'}; added: ${lost.join(', ') || 'none'})`,
  );
  expect(
    JSON.stringify(back.data.globalConfig) === JSON.stringify(sp.globalConfig),
    'the configuration is equal to Super Productivity’s',
  );
  const task = (slice) => Object.keys(slice.entities).length;
  console.log(`tasks: Super Productivity ${task(sp.task)}, app ${task(back.data.task)}`);
} catch (error) {
  await page
    .screenshot({ path: resolve('dist', 'walk', `roundtrip-failed-${name}.png`) })
    .catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await site.close();
}
