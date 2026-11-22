// Walks a journey of the user's own in the built standalone app (#89),
// from the quick form's first question to the first completion: the
// five questions, the steps it builds with the kind hint, keeping it,
// starting it from the moment the user named, the recurring task the
// app creates on the chosen weekdays, and the tick on Today. Run after
// `npm run build`.
//
//   node e2e/walk-quick.mjs [width height]
/* global document, innerWidth, indexedDB -- in functions the page runs */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, launch, serve } from './serve.mjs';

const [width = 360, height = 720] = process.argv.slice(2).map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });
const MONDAY = '2026-03-02';
const TASK = /read 5 pages/i;

const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
const page = await context.newPage();
await page.clock.install({ time: new Date(`${MONDAY}T08:00:00`) });
page.on('pageerror', (error) => console.log('page error:', error.message));

const shot = (name) => page.screenshot({ path: join(OUT, `${width}-quick-${name}.png`) });
const journey = page.locator('.app-view').nth(1);
const next = () => journey.getByRole('button', { name: 'Next', exact: true }).click();
const answer = (text) => journey.locator('input[type=text]').fill(text);
const fits = async (where) => {
  const seen = await page.evaluate(() => ({
    wide: document.documentElement.scrollWidth > innerWidth,
    small: [...document.querySelectorAll('.app-view:not([hidden]) :is(button, label)')]
      .map((el) => el.getBoundingClientRect())
      .filter((box) => box.width > 0 && (box.height < 44 || box.width < 44)).length,
  }));
  expect(
    !seen.wide && seen.small === 0,
    `${where}: no horizontal scrolling, targets at least 44 px`,
  );
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
  await page.goto(site.url, { waitUntil: 'load' });
  await page.locator('.app-tabs').waitFor();
  await page.getByRole('button', { name: 'Open the Journey' }).click();
  await journey.getByRole('button', { name: 'Choose a journey' }).click();
  await journey.getByRole('button', { name: 'Your Own Habit' }).click();

  // 1. What: nothing focused on opening, an empty answer says what is missing.
  expect(
    await page.evaluate(() => document.activeElement?.tagName !== 'INPUT'),
    'the first question focuses nothing',
  );
  await next();
  await journey.getByRole('alert').waitFor();
  expect(true, 'an empty answer is not taken, and the screen says so');
  await answer('read');
  await fits('question 1');
  await shot('1-what');
  await next();
  // 2. After what.
  await answer('brushing my teeth in the evening');
  await next();
  // 3. How it grows: pages from 5 to 30, the steps between proposed.
  await journey.getByText('In pages').click();
  const amounts = journey.locator('input[type=number]');
  await amounts.nth(0).fill('5');
  await amounts.nth(0).press('Tab');
  await amounts.nth(1).fill('30');
  await amounts.nth(1).press('Tab');
  await journey.getByText('Step 3').waitFor();
  await fits('question 3');
  await shot('3-grow');
  await next();
  // 4. How often: Monday, Wednesday and Friday.
  await journey.getByText('On chosen weekdays').click();
  await fits('question 4');
  await next();
  // 5. The name.
  await answer('Reading at night');
  await next();

  // The steps it built, with the kind hint for a first step that is not tiny.
  await journey.getByRole('button', { name: 'Keep This Journey' }).waitFor();
  const steps = await journey.locator('.qa-steps li').allInnerTexts();
  expect(
    steps.length === 4 &&
      steps[0] === 'After brushing my teeth in the evening, I will read 5 pages.' &&
      steps[3] === 'After brushing my teeth in the evening, I will read 30 pages.',
    `four steps from the answers: ${steps.join(' | ')}`,
  );
  expect(
    (await journey.locator('.qa-main').innerText()).includes('Could the first step be smaller?'),
    'a first step that is not tiny gets the kind hint, and Keep stays offered',
  );
  await fits('the steps');
  await shot('6-steps');
  await journey.getByRole('button', { name: 'Keep This Journey' }).click();

  // Screen 3: the moment is the user's words, then the journey starts.
  await journey.getByText('Your moment', { exact: true }).waitFor();
  await journey.getByRole('button', { name: 'Start', exact: true }).click();
  await journey.getByRole('button', { name: 'Create the task' }).click();
  const habit = page.getByRole('checkbox', { name: TASK });
  await habit.waitFor();
  const data = await stored();
  const [cfgId] = data.taskRepeatCfg.ids;
  const cfg = data.taskRepeatCfg.entities[cfgId];
  expect(
    cfg.repeatCycle === 'WEEKLY' && cfg.monday && cfg.wednesday && cfg.friday && !cfg.tuesday,
    'the app created the recurring task on Monday, Wednesday and Friday',
  );
  const ids = data.pluginUserData.map((entry) => entry.id);
  expect(
    ids.includes('questarc:journey:own-reading-at-night') &&
      ids.some((id) => id.startsWith('questarc:run:')),
    'the journey is kept as questarc:journey:own-reading-at-night, with its run',
  );

  // The first completion.
  await habit.click();
  await page.locator('.app-habit[aria-checked=true]').waitFor();
  await page.locator('.app-message:not([hidden])').waitFor();
  const said = await page.locator('.app-message').innerText();
  expect(said.startsWith('Read 5 pages: done. 1 of 5 days.'), `the first completion: ${said}`);
  await shot('7-done');
} catch (error) {
  await shot('failed').catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await site.close();
}
