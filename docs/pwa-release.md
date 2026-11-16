---
type: Concept
title: The standalone app as a PWA on Cloudflare
description: How packages/app is published as an installable, offline PWA at its own domain on Cloudflare Workers static assets, like LocalGameGalaxy; the manifest and icons, the service worker's cache and update, the cache headers, the check in a browser, the deploy from main, previews per pull request and the owner's steps.
tags: [standalone-app, pwa, release, cloudflare, service-worker]
generated: { by: claude-code/2.1.326, at: 2026-11-16 }
sources:
  - id: issue91
    title: 'Standalone QuestArc app (#91), step 4: PWA release'
    url: https://github.com/nexumia-de/quest-arc/issues/91
  - id: decision
    title: The standalone app is a third host in this repository
    url: decisions/standalone-app.md
  - id: headers
    title: 'Cloudflare Docs: Workers static assets, headers (default Cache-Control, the _headers file)'
    url: https://developers.cloudflare.com/workers/static-assets/headers/
  - id: action
    title: cloudflare/wrangler-action v4.1.3 (953926a2e2182532811c01a25e53647d93bf07c0), src/wranglerAction.ts and src/commandOutputParsing.ts
    url: https://github.com/cloudflare/wrangler-action/tree/953926a2e2182532811c01a25e53647d93bf07c0
  - id: lgg
    title: 'LocalGameGalaxy: wrangler.jsonc, tools/wrangler, ci.yml job deploy-cloudflare, cleanup-preview.yml'
    url: https://github.com/suitably/localgamegalaxy
---

# The standalone app as a PWA on Cloudflare

The standalone app (`packages/app`, [decision](decisions/standalone-app.md)[^decision])
is published as static files on Cloudflare Workers static assets, at its
own domain `https://questarc.nexumia.de/` (step 4 of #91[^issue91]),
deployed the way the owner's LocalGameGalaxy is[^lgg]. A browser
installs it from there as "QuestArc: Habit Journeys", shown as QuestArc
on a home screen; after the first load it works offline and asks the
network for nothing. Cloudflare only serves the files: there is no
worker code.

The domain `questarc.nexumia.de` is an **agent proposal** for the owner
to confirm; it is set in `packages/app/wrangler.jsonc` and in the smoke
check of `ci.yml`.

## What the build holds

`npm run build -w @questarc/app` writes `packages/app/dist/app/`. Every
path is relative to the page, so the app runs at the domain's root as
under any path:

- `index.html` with the manifest link, the SVG icon, `apple-touch-icon`
  (`icon-180.png`; iOS reads no manifest icons) and the title.
- `manifest.webmanifest`: `id`, `start_url` and `scope` are `./`,
  `display` `standalone`, theme `#6495ed`, background `#f8f8f7`, icons
  `icon.svg` (any size), `icon-192.png`, `icon-512.png` and
  `icon-maskable-512.png` (purpose `maskable`).
- `app.js`, `app.css` and `sw.js`.
- `_headers` (from `src/_headers`): read by Cloudflare, not served, and
  not in the service worker's list.

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
(`cache: 'reload'`), so a new cache never keeps an old file whatever
the server allows. It answers every request from the cache, a
navigation with `index.html`, and never from the network.

**Update**: while online, the browser compares `sw.js` with the
server's on each start of the app. A new build keeps its files, takes
over at once and drops the old cache. The open page keeps the version it
started with; the next start shows the new one. Nothing is announced;
the data in IndexedDB is not touched by an update. Fetching `sw.js` for
this check is the only request after the first load, and it goes to the
app's own address.

## Cache headers

Cloudflare serves static assets with
`Cache-Control: public, max-age=0, must-revalidate` and an `ETag` by
default, and a `_headers` file in the assets folder overrides that per
path[^headers]. `src/_headers` sets `Cache-Control: no-cache` on
`/sw.js`, `/`, `/index.html` and `/manifest.webmanifest`, so a changed
default can never keep an old service worker or page; the deploy's smoke
check reads the header of `sw.js`.

## The check in a browser

`e2e/pwa.mjs` (part of `npm run e2e -w @questarc/app`, so in the CI job
`standalone-app`, which the deploy waits for) serves a copy of the build
at the root, as Cloudflare does, and opens it in Chromium with its own
profile (an incognito context is never installable).
`QUESTARC_PWA_BASE=/some/path/` runs it under a path instead.

- the page links the manifest and Chromium parses it without errors;
  name, short name and the three PNG icons are there;
- Chromium reports no installability errors (`Page.getInstallabilityErrors`);
- the service worker is active with the app's root as scope, one cache
  `questarc-<version>-<hash>` holds every built file;
- offline, a reload and a start with a query (`?lang=de`) start the app;
- a changed build on the server replaces the cache on the next start
  online, with the new file's content.

## Deploying: the job `deploy` in CI

- `packages/app/wrangler.jsonc`: worker `questarc`, assets from
  `./dist/app`, no `main` (no worker code), the custom domain
  `questarc.nexumia.de` as a route, `previews` on.
- `tools/wrangler/`: a package of its own that pins wrangler exactly,
  with its lockfile; not a workspace of the app, updated by Dependabot.
  CI installs it with `npm ci --ignore-scripts`, so wrangler-action finds
  that version and installs nothing itself[^action].
- `.github/workflows/ci.yml`, job `deploy`: runs after `check` (which
  uploads `packages/app/dist/app` as the artifact `questarc-app`) and
  `standalone-app` pass. A push to `main` runs `wrangler deploy`: the app
  at `questarc.nexumia.de` follows `main`, as LocalGameGalaxy's site
  does. A pull request from this repository runs
  `wrangler preview --name pr-<number>` and writes the preview's URL into
  one comment on the pull request (`.github/scripts/preview-comment.cjs`,
  updated on each push). Then a smoke check fetches the page, the
  manifest and `sw.js` with its `no-cache` header. Permissions:
  `contents: read`, `pull-requests: write` for the comment; wrangler's
  telemetry is off.
- Forks and Dependabot get no secrets, so the job is skipped for them;
  without the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
  it writes a notice and uploads nothing, so CI stays green.
- `.github/workflows/cleanup-preview.yml`: when a pull request closes,
  `wrangler preview delete --name pr-<number>` and the comment says the
  preview was removed; by hand (`workflow_dispatch`) it removes a
  preview by name. A pull request without a preview gives a warning, not
  a failure.

The app's tags (`app-v<version>`, proposed) no longer publish the web
app; they stay for the APK ([decision](decisions/standalone-app.md)).

## The owner's steps

1. Create a Cloudflare API token with **Account → Workers Scripts:
   Edit** and, for the zone `nexumia.de`, **Workers Routes: Edit** and
   **DNS: Edit** (the custom domain creates its DNS record), as for
   LocalGameGalaxy.
2. Add the repository secrets `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` to `nexumia-de/quest-arc` (Settings → Secrets
   and variables → Actions).
3. Confirm the domain `questarc.nexumia.de` or name another one
   (`wrangler.jsonc` and the smoke check in `ci.yml`).
4. The next push to `main` deploys; a pull request after that gets its
   preview. GitHub Pages is no longer used.

[^issue91]: Standalone QuestArc app (#91), https://github.com/nexumia-de/quest-arc/issues/91

[^decision]: [The standalone app is a third host in this repository](decisions/standalone-app.md)

[^headers]: Cloudflare Docs, Workers static assets, headers, https://developers.cloudflare.com/workers/static-assets/headers/ (read 2026-11-16)

[^action]: cloudflare/wrangler-action v4.1.3 at 953926a2e2182532811c01a25e53647d93bf07c0: it checks `wrangler --version` in `workingDirectory` and installs only on a mismatch; for `preview` it sets `deployment-url` to the preview's URL.

[^lgg]: LocalGameGalaxy's `wrangler.jsonc`, `tools/wrangler`, `ci.yml` job `deploy-cloudflare` and `cleanup-preview.yml`; QuestArc takes the pattern without worker code, durable objects or `run_worker_first`, and with fixed preview names `pr-<number>`.
