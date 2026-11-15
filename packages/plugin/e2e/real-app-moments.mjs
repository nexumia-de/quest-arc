// Moments in the real app (#96): start "A gentle morning" from a moment
// in the user's own words, see the home with that moment and its growing
// step, give the moment a name; then, with prepared data (the journey
// finished and its habit graduated, written through the view's own
// message to plugin.js), see what runs by itself as one line without a
// box, extend the moment with a second journey tied to that step (a
// chain), and confirm the moment of a journey from before anchors.
// Screenshots go to dist/real-app/moments-*.
//
//   node e2e/real-app-moments.mjs [width height]
/* global document -- in functions the page runs */
import { BASE, expect, install, journey, makeRecurring, open, reopen, start, tick } from './sp.mjs';

const [width = 1200, height = 800] = process.argv.slice(2).map(Number);
// A Monday morning, local time of the browser (UTC in CI).
const first = new Date('2026-11-16T08:00:00');
const { browser, page, view, shot } = await open(width, height, { clock: first });
const name = (n) => shot('moments-', n);
const TASK = 'My first coffee: drink a glass of water';
const STAGES = ['water', 'stretch-1', 'stretch-5', 'plan-day'];
const LAST = 'plan-day';
const STEP = 'drink a glass of water, stretch for five minutes and write down one thing for today';

const questArc = async () => {
  await reopen(page, view);
};
const home = () => view().locator('.qa-main').innerText();
/** Sends a request to plugin.js from inside the view, as the view does. */
const request = (message) =>
  view()
    .locator('body')
    .evaluate(
      (_, sent) =>
        new Promise((resolve, reject) => {
          const messageId = `e2e-${Math.random()}`;
          globalThis.addEventListener('message', function answer(event) {
            if (event.data?.messageId !== messageId) return;
            globalThis.removeEventListener('message', answer);
            if (event.data.type === 'PLUGIN_MESSAGE_RESPONSE') resolve(event.data.result);
            else reject(new Error(event.data.error));
          });
          globalThis.parent.postMessage({ type: 'PLUGIN_MESSAGE', messageId, message: sent }, '*');
        }),
      message,
    );

try {
  const version = await start(page);
  console.log('Super Productivity', version ?? (await install(page)));
  if (version) await install(page);

  // Start from a moment in the user's own words.
  await page.goto(`${BASE}#/plugins/questarc/index`);
  await page.keyboard.press('Escape');
  await view().getByRole('button', { name: 'Choose a journey' }).click();
  await view()
    .getByRole('button', { name: /A gentle morning/ })
    .click();
  await view().getByRole('button', { name: 'Start this journey' }).click();
  const words = view().locator('#qa-moment-words');
  expect((await words.inputValue()) === 'getting up', 'the journey suggests words for the moment');
  expect(
    !(await words.evaluate((el) => el === document.activeElement)),
    'no field is focused when the page opens',
  );
  await words.fill('after my first coffee.');
  await name('0-start');
  await view().getByRole('button', { name: 'Start', exact: true }).click();
  const plan = await view().locator('.qa-plan').first().innerText();
  expect(
    plan.startsWith('After my first coffee, I will drink a glass of water'),
    `the plan takes the user's words, "after" not doubled (${plan})`,
  );
  await view().getByRole('button', { name: 'Create the task' }).click();
  await page.waitForTimeout(2500);
  await makeRecurring(page);
  const messages = await tick(page, TASK);
  expect(
    messages.some((m) => m.startsWith('Drink a glass of water: done. 1 of 5 days.')),
    `the task is titled with the user's moment and counts (${messages.join(' | ')})`,
  );

  // The home is the moments: one, with its growing step and today's tick.
  await questArc();
  const moments = await home();
  expect(
    moments.includes('After my first coffee') && /growing here/i.test(moments),
    `the home shows the moment with its growing step (${moments})`,
  );
  expect(moments.includes('Today: done.'), 'the growing step says today is done');
  expect((await view().locator('.qa-valley-place').count()) === 1, 'one place in the Valley');
  expect((await view().locator('.qa-home input').count()) === 0, 'the home has no boxes to tick');
  await name('1-home');
  // Home → place → back: the growing place opens its journey, back leads to the Valley.
  await view().locator('.qa-valley-place').click();
  await view().locator('.qa-station-card').waitFor();
  await view().getByRole('button', { name: 'Back' }).click();
  await view().locator('.qa-valley').waitFor();
  await journey(view);
  expect(
    (await view().locator('.qa-station-card').innerText()).includes('1 of 5 days'),
    'the growing step opens the journey',
  );

  // A name for the moment.
  await questArc();
  await view().locator('.qa-valley-place').click();
  await view().locator('.qa-station-card').waitFor();
  expect(
    (await view().locator('.qa-place-piece').count()) === 1,
    'the journey screen draws the place piece',
  );
  await name('2a-journey-place');
  await view().getByRole('button', { name: 'Change this moment' }).click();
  await view().locator('#qa-moment-name').fill('Morning');
  await name('2-moment');
  await view().getByRole('button', { name: 'Save' }).click();
  await view().locator('.qa-station-card').waitFor();
  await view().getByRole('button', { name: 'Back' }).click();
  await view().locator('.qa-valley').waitFor();
  expect(
    (await view().locator('.qa-valley-name').innerText()) === 'Morning',
    "the place carries the moment's name",
  );

  // Prepared data: the journey is finished and its habit runs by itself.
  const { records } = await request({ type: 'questarc:get' });
  const runId = Object.keys(records)
    .find((key) => key.startsWith('run:'))
    ?.slice(4);
  const binding = records[`binding:${runId}:water`];
  expect(Boolean(runId && binding?.taskId), 'the first station has its task');
  const today = first.toISOString().slice(0, 10);
  const prepared = {
    [`run-end:${runId}`]: { day: today, reason: 'finished' },
    [`binding:${runId}:${LAST}`]: { ...binding, day: today },
    [`graduation:${runId}:${LAST}:${today}`]: { choice: 'keep' },
  };
  for (const stage of STAGES) {
    prepared[`stage:${runId}:${stage}`] = { acceptedDay: today };
    prepared[`stage-done:${runId}:${stage}`] = { day: today, dataFormat: 2 };
  }
  const written = await request({ type: 'questarc:write', records: prepared });
  expect(
    written.view.anchors[0]?.steps[0]?.state === 'graduated',
    `the graduated step stands at its anchor (${JSON.stringify(written.view.anchors)})`,
  );
  await questArc();
  const rests = await home();
  const label = await view().locator('.qa-valley-place').getAttribute('aria-label');
  expect(
    label.includes('The lantern is lit') && !/growing here/i.test(rests),
    `the place says in words that the routine runs by itself; nothing grows (${label})`,
  );
  await name('3-runs-by-itself');

  // Home → place → back: a place at rest opens its own page; back leads to the Valley.
  await view().locator('.qa-valley-place').click();
  await view().locator('.qa-place').waitFor();
  const routine = await view().locator('.qa-place').innerText();
  expect(
    routine.includes('Your routine here') &&
      routine.includes('Runs by itself') &&
      routine.includes('Nothing is ticked or counted for it any more.'),
    `the place says what runs by itself (${routine})`,
  );
  await name('3a-place');
  await view().getByRole('button', { name: 'Back' }).click();
  await view().locator('.qa-valley').waitFor();

  // Extend this moment, tied to the step that runs by itself (a chain).
  await view().locator('.qa-valley-place').click();
  await view().getByRole('button', { name: 'Extend This Moment' }).click();
  await view()
    .getByRole('button', { name: /A walk after lunch/ })
    .click();
  await view().getByRole('button', { name: 'Start this journey' }).click();
  expect(
    await view().getByRole('radio', { name: 'Morning', exact: true }).isChecked(),
    'the moment is chosen already',
  );
  expect(
    await view().getByRole('radio', { name: 'The moment itself' }).isChecked(),
    'a chain is never the default',
  );
  await view()
    .getByRole('radio', { name: /After I drink a glass of water/ })
    .check();
  await name('4-extend');
  await view().getByRole('button', { name: 'Start', exact: true }).click();
  const chained = await view().locator('.qa-plan').first().innerText();
  expect(
    chained.startsWith(`After I ${STEP}, I will step outside the door`),
    `the plan follows the step (${chained})`,
  );
  await questArc();
  const extended = await home();
  expect(
    (await view().locator('.qa-valley-place').count()) === 1 &&
      /growing here/i.test(extended) &&
      (await view().locator('.qa-valley-place').getAttribute('aria-label')).includes(
        'The lantern is lit',
      ),
    `both journeys stand at the one moment (${extended})`,
  );
  await name('5-chain');

  // A journey from before anchors: asked once, then it has its moment.
  const now = await request({ type: 'questarc:get' });
  const walk = Object.keys(now.records)
    .find((key) => key.startsWith('run:') && now.records[key].journeyId === 'walk-after-lunch')
    ?.slice(4);
  await request({ type: 'questarc:write', records: { [`run-anchor:${walk}`]: '' } });
  await questArc();
  const asked = await home();
  expect(
    asked.includes('After lunch') && asked.includes('Is it still yours?'),
    `the home asks whether the moment is the user's (${asked})`,
  );
  await name('6-before-anchors');
  await view().getByRole('button', { name: 'Yes, That Is It' }).click();
  await page.waitForTimeout(1500);
  const confirmed = await home();
  expect(
    !confirmed.includes('Is it still yours?') && confirmed.includes('After lunch'),
    `confirmed once, the question is gone (${confirmed})`,
  );
  expect((await view().locator('.qa-valley-place').count()) === 2, 'the journey has its own place');
  await name('7-confirmed');

  // Placing is choice records: move a place later, give it a colour, take it back.
  const names = () => view().locator('.qa-valley-name').allInnerTexts();
  const before = await names();
  expect(before.length === 2 && before[0] === 'Morning', `Morning comes first (${before})`);
  await view().locator('.qa-valley-place').first().click();
  await view().getByRole('button', { name: 'Change this moment' }).click();
  await view().getByRole('button', { name: 'Move Later' }).click();
  await view().getByRole('radio', { name: 'Rose' }).check();
  await view().getByRole('radio', { name: 'Right' }).check();
  await page.waitForTimeout(1500);
  await name('8-place-choices');
  const placed = Object.entries((await request({ type: 'questarc:get' })).records).filter(([key]) =>
    key.startsWith('place:'),
  );
  expect(
    placed.some(([, value]) => value.hue === 'rose' && value.side === 'right') &&
      placed.some(([, value]) => value.position === 1),
    `the choices are written as place records (${JSON.stringify(placed)})`,
  );
  await view().getByRole('button', { name: 'Back' }).click();
  await view().getByRole('button', { name: 'Back' }).click();
  await view().locator('.qa-valley').waitFor();
  const after = await names();
  expect(after[1] === 'Morning', `Morning moved later (${after})`);
  await name('9-moved');
  await view().locator('.qa-valley-place').nth(1).click();
  await view().getByRole('button', { name: 'Change this moment' }).click();
  await view().getByRole('button', { name: 'Use the suggestion' }).click();
  await page.waitForTimeout(1500);
  const taken = Object.values((await request({ type: 'questarc:get' })).records).filter(
    (value) => value?.hue === 'rose',
  );
  expect(taken.length === 0, 'the suggestion gives the place back to the rules');
} catch (error) {
  await shot('failed-', 'page').catch(() => undefined);
  throw error;
} finally {
  await browser.close();
}
