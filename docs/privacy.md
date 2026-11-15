---
type: Concept
title: Privacy
description: What QuestArc stores, what it never collects and who sees what, each fact with the code that proves it, and where the user-facing privacy text lives.
tags: [privacy, store-listing, pwa, google-play]
generated: { by: claude-code/2.1.325, at: 2026-11-15 }
sources:
  - id: issue120
    title: 'Privacy statement for the app and its store listings (#120)'
    url: https://github.com/nexumia-de/quest-arc/issues/120
  - id: app
    title: 'packages/app/src (store/, sw.ts, main.ts, index.html) and build.mjs'
    url: ../packages/app/src
  - id: plugin
    title: 'packages/plugin manifest and adapter'
    url: ../packages/plugin/src
  - id: ui
    title: 'packages/ui/src, the shared screens'
    url: ../packages/ui/src
---

# Privacy

QuestArc collects nothing. Google Play needs a privacy statement at a
public URL [^issue120]; the text is written from the code, and this
file lists what the code proves. When code changes one of these facts,
change this file and the page in the same pull request.

## Verified facts

Standalone app [^app]:

- The dataset is in IndexedDB: database `questarc`, store `dataset`,
  key `current` (`store/idb.ts`). The browser is asked to keep it
  (`navigator.storage.persist()`, `store/persist.ts`); that is not a
  network request.
- Small per-device "seen" flags and the side-panel switch are in
  `localStorage` under `questarc:` (`packages/ui/src/ui/seen.ts`).
- No `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon` in
  `packages/app/src`, `packages/ui/src` or `packages/plugin/src`. The
  only `http(s)` strings there are SVG namespaces and the MIT
  attribution comment in `store/global-config.ts`. One URL is data:
  `store/sp-default-config.json` holds Super Productivity's default sync
  base URL as part of the backup format; nothing reads it for requests.
- `index.html` has a Content-Security-Policy with `default-src 'self'`
  and `connect-src 'none'`, and loads only `app.css`, `app.js`, the
  manifest and the icon from its own origin.
- The service worker serves every request from its own cache, never
  from the network, after install (`sw.ts`). The cache is filled once
  from the host at install and replaced by a new build.
- Export is a download of a backup JSON file made in the page
  (`main.ts`, `URL.createObjectURL`); import reads a file the user
  picks (`screens/data.ts`). There are no automatic backups to a server.
- No accounts, analytics or crash reports exist in the code.
  `navigator.language` is read once to pick the language (`main.ts`).

Plugin [^plugin]:

- `manifest.json` asks for: `getAppState`, `getArchivedTasks`,
  `getDayContext`, `loadSyncedData`, `listSyncedDataKeys`,
  `persistDataSynced`, `showSnack`, `showIndexHtmlAsView`, `addTask`,
  `selectTask`, `registerTaskContextMenuEntry`; `dataSharing` is empty;
  no network permission. It stores only QuestArc's choice records
  through the plugin persistence API ([data model](data-model.md)),
  plus the side-panel switch in `localStorage`
  (`adapter/side-panel.ts`).

Shared screens [^ui]:

- Settings, "Remove QuestArc's data" (`ui/screens/settings.ts`) empties
  the choice records. It does not delete the habits' tasks in the
  standalone app's dataset; clearing site data or uninstalling does.
- Two external links in Settings (source code on GitHub, support on
  Liberapay) are plain `<a target="_blank">` added by another change in
  the same release; they load nothing until tapped. This was not in the
  code when this file was written and must be checked once it is
  merged.

## What the host sees

The PWA is served from GitHub Pages. As with any web server, GitHub sees
the IP address and the user agent of whoever loads the page
([GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)).
QuestArc itself never receives this. After install the app does not
contact the host for data. An APK or F-Droid build has no host at all.

## Where the text lives

[`packages/app/src/privacy.html`](../packages/app/src/privacy.html): one
self-contained page, English and German, no scripts or external
resources. `build.mjs` copies it to `dist/app/privacy.html` and the
service worker precaches it, so it also works offline. Its URL is
`<app URL>/privacy.html`.

## Open

- The app is not deployed yet: no workflow in `.github/workflows/`
  publishes to GitHub Pages and no URL is recorded, so the public URL
  the stores link to is not fixed.
- The contact of the person responsible is a placeholder
  (`[contact: to be filled in by the owner]`) in both languages.
- Legal review is not part of this; see issue #123.

[^issue120]: <https://github.com/nexumia-de/quest-arc/issues/120>

[^app]: [packages/app/src](../packages/app/src)

[^plugin]: [packages/plugin/src](../packages/plugin/src)

[^ui]: [packages/ui/src](../packages/ui/src)
