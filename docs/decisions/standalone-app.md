---
type: Decision Record
title: The standalone app is a third host in this repository
description: QuestArc gets a standalone web app for people without Super Productivity. It lives in this repository as packages/app next to the plugin; the screens and the adapter core are one shared package, packages/ui, that both hosts wrap. PWA first, then an APK; no Flatpak; released on its own tags; hosted on Cloudflare at its own domain, deployed from main.
tags: [decision, standalone-app, architecture, packages, pwa]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: issue91
    title: "Standalone QuestArc app: one web app as PWA, APK and Flatpak (#91), with the owner's decisions of 2026-11-12 and 2026-11-14 in its comments"
    url: https://github.com/nexumia-de/quest-arc/issues/91
  - id: spike
    title: 'Spike: the screens and the engine as a standalone web app'
    url: standalone-app-spike.md
  - id: lgg
    title: 'LocalGameGalaxy: wrangler.jsonc, tools/wrangler, ci.yml job deploy-cloudflare'
    url: https://github.com/suitably/localgamegalaxy
---

# The standalone app is a third host in this repository

## Context

QuestArc was "a plugin and an engine": one pure engine with two hosts,
the Super Productivity plugin here and the game page in Pensum
([architecture](../architecture.md)). Who is not reached is everyone who
wants the journeys but no task manager (#91[^issue91]). The spike showed
that the plugin's screens, adapter and engine run unchanged as an
offline web app on a small dataset in Super Productivity's backup
format[^spike].

## Decision

1. **A third host.** The standalone app is a host of the same engine:
   rule 4 of the architecture stays (all game decisions in
   `packages/engine`). It is not a task manager: no projects, tags,
   timers or one-off tasks.
2. **Same repository** (owner, 2026-11-14). The app is `packages/app`
   here, not a repository of its own. It shares the code that changes
   most, and a rule change stays one pull request: document, test
   vectors, engine and both hosts. A second repository would need a
   release of the shared packages and a version bump for every such
   change.
3. **One shared package** (owner, 2026-11-14[^issue91]). `packages/ui`
   holds the screens and the host-independent adapter core (brain,
   records, hooks, day, messages in words, the pictures' pack); plugin
   and app are thin shells around it:

   ```
   packages/engine   the rules, pure
   packages/ui       screens, style and default theme, adapter core
   packages/plugin   Super Productivity host: plugin.js, the view's transport, the manifest
   packages/app      standalone host: store, Today and Data, service worker
   ```

   `packages/ui` never imports from a host. The screens get their host
   passed in (`createApp(root, client, host)`); a host that can create a
   recurring task offers `createHabit`, so the app needs no hand-over of
   the repeat ([recurring-task setup](recurring-task-setup.md) stays the
   plugin's way).

4. **Texts that name the host** stay in `content/i18n` in the plugin's
   wording; the app replaces the few keys that differ with its own
   table. The shared texts module gets no host switch.
5. **Packages and releases** (owner, 2026-11-12[^issue91]): a PWA
   first, then an APK (GitHub releases, F-Droid, Google
   Play). **No Flatpak**: Day Planner is the Flatpak home of the
   journeys, and Linux desktop users can install the PWA. The app is
   released on its own tags, apart from the plugin's `v<version>`; the
   tag pattern is fixed with the first release. **Agent proposal** for
   the owner to confirm (2026-11-16): `app-v<version>`, the version
   from `packages/app/package.json`; such tags are for the APK, the web
   app follows `main` (decision 9).
6. **Visible name**: "QuestArc: Habit Journeys", shown as QuestArc on a
   home screen (owner, 2026-11-12[^issue91]).
7. **No plain habits** (owner, 2026-11-14[^issue91]): Today shows the
   moments with the one growing step; what runs by itself is not ticked.
   Built with #164: a recurring task that no journey uses (from an
   imported backup) is still listed, last, so nothing of the user's is
   hidden; the app offers no way to add one.
8. **Day start**: the app's dataset carries Super Productivity's whole
   default configuration, so an export imports without repair and the
   day start travels with the backup (owner, 2026-11-14[^issue91]).
9. **Hosting the PWA** (owner, 2026-11-16): on Cloudflare Workers
   static assets at the app's own domain, deployed like the owner's
   LocalGameGalaxy[^lgg], instead of GitHub Pages
   ([PWA release](../pwa-release.md)). Why:
   - **Own origin per app.** A PWA's storage (IndexedDB, the service
     worker's cache, the install) belongs to its origin. On
     `nexumia-de.github.io` every Pages site of the organisation would
     share one origin with QuestArc; on its own domain the app's data is
     its own.
   - **A preview per pull request**, linked in the pull request, so a
     change to a screen can be tried on a phone before it is merged;
     removed when the pull request closes.
   - **One deploy pattern** across the owner's web apps: pinned
     wrangler in `tools/wrangler`, `wrangler-action`, the same secrets.

   **Trigger**: every push to `main` deploys the web app, as in
   LocalGameGalaxy; a PWA updates itself on the next start, so `main` is
   what users get. App tags stay for the later APK. The domain
   `questarc.nexumia.de` is an agent proposal for the owner to confirm.
   Cloudflare only serves the static files, with no worker code: the
   no-network rule after the first load holds unchanged.

## Consequences

- The repository is no longer "a plugin and an engine" only; the
  [architecture](../architecture.md) names three hosts. The phosh-toolkit
  GTK and Flatpak rules still do not apply here (D6).
- The no-network rule holds for the app as for the plugin: after the
  first load the page asks the network for nothing; the APK carries
  everything.
- A change to a screen is tested in both hosts: the plugin's real-app
  job and the app's walk (`standalone-app` in CI, not a required check
  for now).
- The PWA is ready to publish: installable, offline, checked in a
  browser at the root, deployed from `main` by the CI job `deploy` to
  Cloudflare, with previews for pull requests
  ([PWA release](../pwa-release.md)); the owner adds the Cloudflare
  secrets and confirms the domain.
- Today is grouped by moments (#164,
  [behaviour](../behaviour.md#10-today-standalone-app)), and the Data
  screen offers language and appearance, kept on the device outside the
  dataset (#165, [behaviour](../behaviour.md#11-data-standalone-app)). Today offers "won't do" with undo, and a habit has its page:
  schedule, pause, leaving out the next time (#166,
  [behaviour](../behaviour.md#12-a-habit-standalone-app)). Open in the
  plan (#91) were automatic local backups and the APK with reminders;
  both wait ([decision](standalone-app-after-pwa.md), 2026-11-22).

[^issue91]: Standalone QuestArc app (#91) and the owner's decisions in its comments, https://github.com/nexumia-de/quest-arc/issues/91

[^lgg]: LocalGameGalaxy, `wrangler.jsonc`, `tools/wrangler` and the CI job `deploy-cloudflare`, https://github.com/suitably/localgamegalaxy

[^spike]: [Spike: the screens and the engine as a standalone web app](standalone-app-spike.md)
