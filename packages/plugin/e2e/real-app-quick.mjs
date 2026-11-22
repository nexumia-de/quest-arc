// Walks a journey of the user's own inside Super Productivity's web app
// (#89), from the quick form's first question to the first completion:
// the five questions, Keep This Journey, the start, the task handed over
// and made recurring in Super Productivity's own dialog, and the tick.
// Screenshots go to dist/real-app/.
//
//   node e2e/real-app-quick.mjs [width height]
import { BASE, expect, install, makeRecurring, open, start, tick } from './sp.mjs';

const [width = 1200, height = 800] = process.argv.slice(2).map(Number);
const { browser, page, view, shot } = await open(width, height);
const next = () => view().getByRole('button', { name: 'Next', exact: true }).click();
const answer = (text) => view().locator('input[type=text]').fill(text);

try {
  await start(page);
  await install(page);
  await page.goto(`${BASE}#/plugins/questarc/index`);
  await page.keyboard.press('Escape');
  await view().getByRole('button', { name: 'Choose a journey' }).click();
  await view().getByRole('button', { name: 'Your Own Habit' }).click();
  await answer('read');
  await next();
  await answer('brushing my teeth in the evening');
  await next();
  await view().getByText('In pages').click();
  const amounts = view().locator('input[type=number]');
  await amounts.nth(0).fill('1');
  await amounts.nth(0).press('Tab');
  await amounts.nth(1).fill('10');
  await amounts.nth(1).press('Tab');
  await view().getByText('Step 2').waitFor();
  await shot('quick-', '1-grow');
  await next();
  await next(); // every day
  await answer('Reading at night');
  await next();
  await view().getByRole('button', { name: 'Keep This Journey' }).click();
  await view().getByText('Your moment', { exact: true }).waitFor();
  expect(true, 'the journey is kept and opens its start');
  await view().getByRole('button', { name: 'Start', exact: true }).click();
  await view().getByRole('button', { name: 'Create the task' }).click();
  await page.waitForTimeout(2500);
  await shot('quick-', '2-created');

  await makeRecurring(page);
  const messages = await tick(page, 'read 1 page');
  expect(
    messages.some((m) => m.startsWith('Read 1 page: done. 1 of')),
    `message after the first completion (${messages.join(' | ')})`,
  );
  await shot('quick-', '3-done');
} catch (error) {
  await shot('failed-quick-', 'page').catch(() => undefined);
  throw error;
} finally {
  await browser.close();
}
