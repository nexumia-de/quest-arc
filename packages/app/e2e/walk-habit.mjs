// Walks what the built standalone app lets the user do to a habit
// (#166): leave today's task out ("won't do") and undo it, the habit's
// page with its plan sentence, pause and resume, another schedule, and
// leaving out the next time. After each step it reads what the app
// stored. The export goes to dist/walk/backup-habit-<width>.json with
// expect-habit-<width>.json, which sp-import.mjs imports into a real
// Super Productivity. Then a day without a task: the habit is listed
// under "Not today". Run after `npm run build`.
//
//   node e2e/walk-habit.mjs [width height]
/* global document, innerWidth, indexedDB -- in functions the page runs */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, launch, serve } from './serve.mjs';

const [width = 360, height = 720] = process.argv.slice(2).map(Number);
const OUT = resolve('dist', 'walk');
mkdirSync(OUT, { recursive: true });
const TASK = 'Getting up: drink a glass of water';
const MONDAY = '2026-03-02';

const site = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
const page = await context.newPage();
await page.clock.install({ time: new Date(`${MONDAY}T08:00:00`) });
page.on('pageerror', (error) => console.log('page error:', error.message));

const shot = (name) => page.screenshot({ path: join(OUT, `${width}-habit-${name}.png`) });
const tab = (name) => page.locator('.app-tabs').getByRole('button', { name, exact: true }).click();
const today = page.locator('.app-view').first();
const journey = page.locator('.app-view').nth(1);
const habit = () => page.getByRole('checkbox', { name: TASK });
const said = (text) => page.locator('.app-message:not([hidden])').getByText(text).waitFor();
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
/** The stored dataset once `ready` holds for it. */
const storedWhen = async (ready) => {
  let data;
  for (let i = 0; i < 30; i += 1) {
    data = await stored();
    if (ready(data)) return data;
    await page.waitForTimeout(100);
  }
  return data;
};
const fits = async (where) => {
  const seen = await page.evaluate(() => ({
    wide: document.documentElement.scrollWidth > innerWidth,
    small: [...document.querySelectorAll('.app-view:not([hidden]) :is(button, select, label)')]
      .map((el) => el.getBoundingClientRect())
      .filter((box) => box.width > 0 && (box.height < 44 || box.width < 44)).length,
  }));
  expect(
    !seen.wide && seen.small === 0,
    `${where}: no horizontal scrolling, targets at least 44 px`,
  );
};
const openPage = async () => {
  await today.getByRole('button', { name: `More about ${TASK}` }).click();
  await today.getByRole('button', { name: 'About This Habit' }).click();
  await today.getByRole('heading', { name: TASK }).waitFor();
};

try {
  await open();
  await page.getByRole('button', { name: 'Open the Journey' }).click();
  await journey.getByRole('button', { name: 'Choose a journey' }).click();
  await journey.getByRole('button', { name: /A gentle morning/ }).click();
  await journey.getByRole('button', { name: 'Start this journey' }).click();
  await journey.locator('#qa-why').fill('Calmer mornings');
  await journey.getByRole('button', { name: 'Start', exact: true }).click();
  await journey.getByRole('button', { name: 'Create the task' }).click();
  await habit().waitFor();
  const [cfgId] = (await stored()).taskRepeatCfg.ids;
  const taskId = `rpt_${cfgId}_${MONDAY}`;
  const cfg = (data) => data.taskRepeatCfg.entities[cfgId];
  const task = (data) => data.task.entities[taskId];

  // Won't do today, and undo.
  await today.getByRole('button', { name: `More about ${TASK}` }).click();
  await fits('Today with a task’s actions');
  await shot('0-actions');
  await today.getByRole('button', { name: 'Won’t Do Today' }).click();
  await said('Left out for today.');
  let data = await storedWhen((d) => task(d).isDone);
  expect(
    task(data).isDone && task(data).wontDoOn === task(data).doneOn && data.task.ids.length === 1,
    'won’t do: the task is done with wontDoOn equal to doneOn; no task is removed',
  );
  expect(
    (await habit().innerText()).includes('Left out today') &&
      (await habit().getAttribute('aria-checked')) === 'false',
    'Today says "Left out today", not ticked',
  );
  await shot('1-left-out');
  await tab('Journey');
  const shown = journey.locator('.qa-growing, .qa-station-card').first();
  await shown.waitFor();
  const growing = await shown.innerText();
  expect(growing.includes('0 of 5 days'), 'the journey counts nothing for it');
  expect(!/miss|fail|behind/i.test(growing), 'and blames nothing');
  await tab('Today');
  await page.locator('.app-message').getByRole('button', { name: 'Undo' }).click();
  data = await storedWhen((d) => !task(d).isDone);
  expect(
    !task(data).isDone && !('doneOn' in task(data)) && typeof task(data).wontDoOn === 'number',
    'undo opens the task again: doneOn is gone, wontDoOn stays behind as in Super Productivity',
  );

  // The habit's page.
  await openPage();
  const pageText = await today.locator('.qa-main').innerText();
  expect(
    pageText.includes('After getting up, I will drink a glass of water') &&
      pageText.includes('Now: Every day'),
    'the habit’s page shows the plan sentence and the schedule',
  );
  await fits('the habit’s page');
  await shot('2-page');
  await today.getByRole('button', { name: 'Back', exact: true }).click();
  await habit().waitFor();
  expect(true, 'back leads to Today');
  await openPage();

  // Pause and resume.
  await today.getByRole('button', { name: 'Pause', exact: true }).click();
  await said('Paused.');
  data = await storedWhen((d) => cfg(d).isPaused);
  expect(cfg(data).isPaused === true && !task(data).isDone, 'pause: isPaused, the open task stays');
  await today.getByText(/Paused\. Paused days don.t count\./).waitFor();
  await tab('Journey');
  await journey
    .getByText(/Paused/)
    .first()
    .waitFor();
  expect(true, 'the journey says it is paused');
  await tab('Today');
  await today.getByRole('button', { name: 'Resume' }).click();
  await said('Resumed.');
  data = await storedWhen((d) => !cfg(d).isPaused);
  expect(
    cfg(data).isPaused === false && cfg(data).lastTaskCreationDay === MONDAY,
    'resume: not paused, the cursor does not move back',
  );
  await tab('Journey');
  await journey.locator('.qa-growing, .qa-station-card').first().waitFor();
  await page.waitForTimeout(300);
  expect((await journey.getByText(/Paused/).count()) === 0, 'the journey goes on');
  await tab('Today');

  // Another schedule: Monday, Wednesday, Friday.
  await today.getByLabel('On chosen weekdays').click();
  await today.getByText('A weekly schedule needs at least one weekday.').waitFor();
  expect(
    await today.getByRole('button', { name: 'Save Schedule' }).isDisabled(),
    'a weekly schedule without a weekday cannot be saved',
  );
  for (const day of ['Monday', 'Wednesday', 'Friday']) await today.getByLabel(day).click();
  await fits('the habit’s page with weekdays');
  await shot('3-schedule');
  await today.getByRole('button', { name: 'Save Schedule' }).click();
  await said('Schedule changed.');
  data = await storedWhen((d) => cfg(d).repeatCycle === 'WEEKLY');
  expect(
    cfg(data).quickSetting === 'CUSTOM' &&
      cfg(data).repeatEvery === 1 &&
      cfg(data).monday &&
      !cfg(data).tuesday &&
      cfg(data).wednesday &&
      cfg(data).friday &&
      cfg(data).startDate === MONDAY &&
      cfg(data).lastTaskCreationDay === MONDAY &&
      typeof cfg(data).lastTaskCreation === 'number',
    'the schedule is stored as Super Productivity stores it',
  );
  expect(
    task(data).dueDay === MONDAY && data.tag.entities.TODAY.taskIds.join() === taskId,
    'today is still an occurrence: the open task stays on today',
  );
  await today.getByText('Now: On Monday, Wednesday, Friday').waitFor();

  // Leave out the next time, take it back, leave it out again.
  const next = today.getByText(/^Next time: Wednesday/);
  await next.waitFor();
  await today.getByRole('button', { name: 'Leave Out That Day' }).click();
  data = await storedWhen((d) => cfg(d).deletedInstanceDates?.length === 1);
  expect(
    cfg(data).deletedInstanceDates.join() === '2026-03-04' && data.task.ids.length === 1,
    'leaving out the next time writes its date; no task is touched',
  );
  await today.getByText(/^Left out: Wednesday/).waitFor();
  await today.getByText(/^Next time: Friday/).waitFor();
  await today.getByRole('button', { name: 'Take Back' }).click();
  data = await storedWhen((d) => cfg(d).deletedInstanceDates?.length === 0);
  expect(cfg(data).deletedInstanceDates.length === 0, 'taking it back removes the date');
  await today.getByRole('button', { name: 'Leave Out That Day' }).click();
  await today.getByText(/^Left out: Wednesday/).waitFor();
  await fits('the habit’s page with a day left out');
  await shot('4-left-out-ahead');
  await today.getByRole('button', { name: 'Back', exact: true }).click();

  // Export for the import into Super Productivity.
  await tab('Data');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export a Backup' }).click(),
  ]);
  const file = join(OUT, `backup-habit-${width}.json`);
  await download.saveAs(file);
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(
    backup.crossModelVersion === 4.5 &&
      !JSON.stringify(backup.data.task.entities).includes(':null') &&
      !JSON.stringify(backup.data.taskRepeatCfg.entities[cfgId]).includes(':null'),
    'the export is a CompleteBackup; no field of the task or the repeat is null',
  );
  writeFileSync(
    join(OUT, `expect-habit-${width}.json`),
    JSON.stringify({
      journey: 'After getting up',
      card: '0 of 5 days',
      why: 'Calmer mornings',
      clock: `${MONDAY}T08:30:00`,
    }),
  );

  // Tuesday is no occurrence: after Monday's tick the habit is under "Not today".
  await tab('Today');
  await habit().click();
  await page.locator('.app-habit[aria-checked=true]').waitFor();
  await page.clock.setSystemTime(new Date('2026-03-03T08:00:00'));
  await open();
  const line = today.getByRole('button', { name: new RegExp(TASK) });
  await line.waitFor();
  const list = await today.locator('.qa-main').innerText();
  expect(
    list.includes('Nothing is due today.') &&
      list.includes('Not today') &&
      list.includes('On Monday, Wednesday, Friday'),
    'a day without a task lists the habit under "Not today" with its schedule',
  );
  await fits('Today without a task');
  await shot('5-not-today');
  await line.click();
  await today.getByRole('heading', { name: TASK }).waitFor();
  expect(true, 'its line opens the habit’s page');
} catch (error) {
  await shot('failed').catch(() => undefined);
  throw error;
} finally {
  await browser.close();
  await site.close();
}
