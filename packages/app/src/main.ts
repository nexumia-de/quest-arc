// The standalone app (#93, a spike): the shared adapter and screens on
// the app's own host. Where the plugin has plugin.js and a view in an
// iframe with messages in between, the app is one page: the screens ask
// the brain directly. Today and Data are the app's own screens.
import { createBrain } from '@questarc/ui/adapter/brain';
import { registerHooks } from '@questarc/ui/adapter/hooks';
import { artPackIn } from '@questarc/ui/adapter/art-pack';
import { messageFor } from '@questarc/ui/adapter/snacks';
import { builtInJourneys } from '@questarc/ui/shared/content';
import { useLanguage } from '@questarc/ui/shared/languages';
import type { State } from '@questarc/ui/shared/protocol';
import { language, t } from '@questarc/ui/shared/texts';
import { createApp } from '@questarc/ui/ui/app';
import { setArt } from '@questarc/ui/ui/art-store';
import type { Client } from '@questarc/ui/ui/client';
import { h } from '@questarc/ui/ui/dom';

import { dayContext, dayStartTime, withDayStart } from './day';
import { createHost } from './host';
import { applyHostTexts } from './host-texts';
import { applyAppearance, createPreferences, localeFor } from './preferences';
import { renderData } from './screens/data';
import { createHabitPage } from './screens/habit-page';
import { renderToday } from './screens/today';
import { habitsNotToday, todayMoments } from './screens/today-moments';
import { createShell } from './shell';
import { BackupError, parseBackup, toBackup } from './store/backup';
import { freshDataset, type Dataset } from './store/dataset';
import { isHabit, isWontDo, wontDo } from './store/habit-actions';
import { setDone, todaysTasks } from './store/habits';
import { indexedDbPersistence } from './store/idb';
import { keepDataOnce } from './store/persist';
import { createInstances } from './store/instances';
import { openStore } from './store/store';
import { at } from './texts';

const DAY_CHECK_MS = 60_000;

const preferences = createPreferences();

/**
 * The app speaks the language the user chose on the Data screen (#165);
 * without a choice the language of the device (issue #39): German for a
 * German locale, English for any other; `?lang=de` says it by hand, as
 * a host that embeds the app does with its own locale.
 */
const speak = (): void => {
  useLanguage(
    localeFor(
      preferences.language(),
      new URLSearchParams(location.search).get('lang'),
      navigator.language,
    ),
    builtInJourneys,
  );
  applyHostTexts();
  document.documentElement.lang = language();
};
speak();
// Light or dark by choice, before the first screen is drawn.
applyAppearance(document.documentElement, preferences.appearance());

const start = async (root: HTMLElement): Promise<void> => {
  const store = await openStore(indexedDbPersistence(), freshDataset);
  const shell = createShell(root);
  const today = () => dayContext(store.data, new Date()).todayStr;

  const host = createHost({
    store,
    showSnack: ({ msg }) => shell.message(msg),
    selectTask: () => shell.show('today'),
  });

  let showJourney = (): void => shell.show('journey');
  const game = createBrain({
    api: host.api,
    journeys: builtInJourneys,
    onEvents: (events, view, journeys) => {
      const msg = messageFor(events, view, journeys);
      if (msg) {
        shell.message(msg, { label: t('ui.snack.show'), run: () => showJourney() });
      }
    },
  });
  registerHooks(host.api, game.refresh);

  const art = artPackIn();
  setArt(art);
  const client: Client = {
    get: () => game.state(),
    write: (records) => game.write(records),
    checkJourney: (journey) => game.checkJourney(journey),
    // texts and style are part of the app itself (app.js, app.css)
    content: async () => ({ language: language(), texts: {}, style: '', art }),
  };
  const journey = createApp(shell.views.journey, client, host.view);
  // The view's home is the moments (#96); a message's Show leads to the journey.
  showJourney = () => {
    shell.show('journey');
    journey.openJourney();
  };

  // Today's instances, made once per logical day.
  let day = '';
  const newDay = async (): Promise<void> => {
    const now = today();
    if (now === day) return;
    day = now;
    await store.update((data) => createInstances(data, now));
    host.emit('dayChange', 'dataChanged');
  };

  const replace = async (next: Dataset): Promise<void> => {
    await store.update(() => next);
    day = '';
    host.emit('persistedDataChanged');
    await newDay();
  };

  const exportBackup = (): void => {
    const file = new Blob([JSON.stringify(toBackup(store.data, Date.now()))], {
      type: 'application/json',
    });
    const link = h('a', {
      href: URL.createObjectURL(file),
      download: `questarc-backup-${today()}.json`,
    }) as HTMLAnchorElement;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
  };

  const importBackup = async (file: File): Promise<void> => {
    const before = store.data;
    try {
      await replace(parseBackup(await file.text()));
    } catch (error) {
      shell.message(
        at(`data.problem.${error instanceof BackupError ? error.problem : 'not-a-backup'}`),
      );
      return;
    }
    shell.message(at('data.imported'), {
      label: at('data.undo'),
      run: () => void replace(before).then(() => shell.message(at('data.restored'))),
    });
  };

  const keepData = keepDataOnce();
  // The game state Today was last drawn from: a tick shows at once, the
  // moments follow when the engine has looked again.
  let known: State | undefined;
  /** The task whose further actions are open on Today. */
  let panel: string | undefined;
  const allTasks = () =>
    Object.values(store.data.task.entities).filter((task) => task !== undefined);
  const change = (next: (data: Dataset) => Dataset): Promise<void> =>
    store.update(next).then(() => host.emit('dataChanged'));
  const habitPage = createHabitPage({
    root: shell.views.today,
    store,
    today,
    game: () => known,
    change,
    message: (text, action) => shell.message(text, action),
    redraw: () => drawToday(),
  });
  const drawToday = (): void => {
    if (habitPage.draw()) return;
    const tasks = todaysTasks(store.data, today());
    const habits = Object.values(store.data.taskRepeatCfg.entities).filter(isHabit);
    renderToday(shell.views.today, {
      today: today(),
      moments: todayMoments(tasks, known, allTasks()),
      resting: habitsNotToday(habits, tasks, known, allTasks()).map((cfg) => ({
        id: cfg.id,
        title: cfg.title ?? '',
        note: habitPage.note(cfg),
      })),
      hasHabits: store.data.taskRepeatCfg.ids.length > 0,
      ...(panel === undefined ? {} : { panel }),
      togglePanel: (taskId) => {
        panel = panel === taskId ? undefined : taskId;
        drawToday();
      },
      // A tap ticks off; on a task that is done or left out it opens it again.
      toggle: (task) => void change((data) => setDone(data, task.id, !task.isDone, Date.now())),
      wontDo: (task) => {
        panel = undefined;
        void change((data) => wontDo(data, task.id, Date.now())).then(() =>
          shell.message(at('today.left.done'), {
            label: at('data.undo'),
            // Undo opens it again, and only while it is still left out.
            run: () =>
              void change((data) => {
                const now = data.task.entities[task.id];
                return now && isWontDo(now) ? setDone(data, task.id, false, Date.now()) : data;
              }),
          }),
        );
      },
      openHabit: (cfgId) => {
        panel = undefined;
        habitPage.open(cfgId);
      },
      openJourney: () => shell.show('journey'),
    });
  };
  const draw = async (): Promise<void> => {
    keepData(store.data.taskRepeatCfg.ids.length > 0);
    drawToday();
    renderData(shell.views.data, {
      dayStart: dayStartTime(store.data),
      setDayStart: (time) => void replace(withDayStart(store.data, time)),
      exportBackup,
      importBackup: (file) => void importBackup(file),
      language: preferences.language(),
      setLanguage: (choice) => {
        preferences.setLanguage(choice);
        speak();
        shell.relabel();
        void draw();
      },
      appearance: preferences.appearance(),
      setAppearance: (choice) => {
        preferences.setAppearance(choice);
        applyAppearance(document.documentElement, choice);
        void draw();
      },
    });
    try {
      const state = await game.state();
      if (state !== known) {
        known = state;
        drawToday();
      }
      journey.update(state);
    } catch {
      journey.showError(t('ui.error.load'));
    }
  };

  host.onChange(() => void draw());
  await newDay();
  await draw();
  performance.mark('questarc-ready');

  setInterval(() => void newDay(), DAY_CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void newDay();
  });
};

const root = document.getElementById('app') ?? document.body;
start(root).catch(() => {
  root.replaceChildren(h('div', { class: 'qa-callout', role: 'alert' }, at('error.start')));
});

// After the first load the service worker answers every request from
// its cache, so the app works offline and asks the network for nothing.
if ('serviceWorker' in navigator) void navigator.serviceWorker.register('sw.js');
