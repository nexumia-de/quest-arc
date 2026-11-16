---
type: Concept
title: The standalone app as a PWA on GitHub Pages
description: How packages/app is published as an installable, offline PWA at nexumia-de.github.io/quest-arc; the manifest and icons, the service worker's cache and update, the check in a browser, the tag app-v<version> and the owner's steps.
tags: [standalone-app, pwa, release, github-pages, service-worker]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: issue91
    title: 'Standalone QuestArc app (#91), step 4: PWA release on GitHub Pages'
    url: https://github.com/nexumia-de/quest-arc/issues/91
  - id: decision
    title: The standalone app is a third host in this repository
    url: decisions/standalone-app.md
  - id: pages
    title: 'GitHub Docs: using custom workflows with GitHub Pages'
    url: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
---

# The standalone app as a PWA on GitHub Pages

The standalone app (`packages/app`, [decision](decisions/standalone-app.md)[^decision])
is published as static files on GitHub Pages, at
`https://nexumia-de.github.io/quest-arc/` (step 4 of #91[^issue91]).
A browser installs it from there as "QuestArc: Habit Journeys", shown as
QuestArc on a home screen; after the first load it works offline and
asks the network for nothing.

## What the build holds

`npm run build -w @questarc/app` writes `packages/app/dist/app/`. Every
path is relative to the page, so the app runs under `/quest-arc/` as
under any other path:

- `index.html` with the manifest link, the SVG icon, `apple-touch-icon`
  (`icon-180.png`; iOS reads no manifest icons) and the title.
- `manifest.webmanifest`: `id`, `start_url` and `scope` are `./`,
  `display` `standalone`, theme `#6495ed`, background `#f8f8f7`, icons
  `icon.svg` (any size), `icon-192.png`, `icon-512.png` and
  `icon-maskable-512.png` (purpose `maskable`).
- `app.js`, `app.css` and `sw.js`.

The PNGs are rendered from `src/icon.svg` and `src/icon-maskable.svg`
(full bleed, the picture scaled to 80 % into the safe zone) by
`npm run icons -w @questarc/app` with the Playwright Chromium the
repository already uses, and committed, so the build needs no browser
and no new dependency. Run it after a change to either SVG;
`test/manifest.test.ts` checks the names, the relative paths and that
each PNG has the size the manifest states.

## The service worker

`sw.js` keeps every file of the build: `build.mjs` lists the output
folder, so a new file cannot be missed. The cache is named
`questarc-<version>-<hash>` after the app's version and the files'
content. At install it fetches the files past the browser's HTTP cache
(`cache: 'reload'`), because GitHub Pages lets files be cached for ten
minutes and a new cache must not keep an old file. It answers every
request from the cache, a navigation with `index.html`, and never from
the network.

**Update**: while online, the browser compares `sw.js` with the
server's on each start of the app. A new build keeps its files, takes
over at once and drops the old cache. The open page keeps the version it
started with; the next start shows the new one. Nothing is announced;
the data in IndexedDB is not touched by an update. Fetching `sw.js` for
this check is the only request after the first load, and it goes to the
app's own address.

## The check in a browser

`e2e/pwa.mjs` (part of `npm run e2e -w @questarc/app`, so in the CI job
`standalone-app` and before every deployment) serves a copy of the build
under `/quest-arc/` and opens it in Chromium with its own profile (an
incognito context is never installable):

- the page links the manifest and Chromium parses it without errors;
  name, short name and the three PNG icons are there;
- Chromium reports no installability errors (`Page.getInstallabilityErrors`);
- the service worker is active with `/quest-arc/` as scope, one cache
  `questarc-<version>-<hash>` holds every built file;
- offline, a reload and a start with a query (`?lang=de`) start the app;
- a changed build on the server replaces the cache on the next start
  online, with the new file's content.

## Publishing: the workflow `Pages`

`.github/workflows/pages.yml` runs for a tag `app-v<version>`, apart
from the plugin's `v<version>` (which `release.yml` takes; `v*` does not
match `app-v…`), and by hand (`workflow_dispatch`) for a chosen branch
or tag. The tag must equal `app-v` and the `version` in
`packages/app/package.json`. The job `build` runs `npm run check` and
the app's walk with the PWA check, then uploads `packages/app/dist/app`
as the Pages artifact; the job `deploy` publishes it. Only `deploy` has
`pages: write` and `id-token: write`; the rest reads only[^pages].

The tag pattern `app-v<version>` is an agent's proposal; the owner fixes
it with the first release ([decision](decisions/standalone-app.md)).

## The owner's steps

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Settings → Environments → `github-pages` → Deployment branches and
   tags: add the tag rule `app-v*` (the environment allows only the
   default branch at first, so a tag's deployment is refused without it).
3. Raise `version` in `packages/app/package.json` in a pull request (it
   is `0.0.0`), then push the tag `app-v<version>` on `main`; or run the
   workflow by hand from `main` to try a deployment first.

[^issue91]: Standalone QuestArc app (#91), https://github.com/nexumia-de/quest-arc/issues/91

[^decision]: [The standalone app is a third host in this repository](decisions/standalone-app.md)

[^pages]: GitHub Docs, using custom workflows with GitHub Pages, https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
