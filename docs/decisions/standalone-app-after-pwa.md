---
type: Decision Record
title: The standalone app stays a PWA for now
description: After the PWA (#91 steps 1–4), no APK, no store listings and no automatic file backups for now; Android users install the PWA from the browser, data is kept with persistent storage and the manual export.
tags: [decision, standalone-app, pwa, android, release]
generated: { by: claude-code/2.1.330, at: 2026-11-22 }
---

# The standalone app stays a PWA for now

Issue #91 planned eight steps. Steps 1 to 4 are on main: the spike
([record](standalone-app-spike.md)), the shared
package `packages/ui` (`bbdb8cb`), the store with export and import
proven against a real Super Productivity (`e68524c`), Today, the habit's
page, language and appearance (`73e2fc5`, `b7897a2`, `4577798`) and the
installable, offline PWA deployed from main (`a1933c8`, `bb783d4`,
[PWA release](../pwa-release.md)). Decided by best practice on
2026-11-22, as the owner asked for open "needs decision" points, for
what was left: step 5 (APK with reminders), step 6 (F-Droid, Google
Play), the automatic local backups named as open in
[the app's decision](standalone-app.md), and step 8 (a Super
Productivity sync folder). Step 7 (Flatpak) was dropped by the owner on
2026-11-12.

## Decision

The standalone app stays a PWA. No APK, no store listings and no
automatic backup files are built now; each becomes its own issue when
the conditions below hold.

## Why

- **The owner's own habits moved** (2026-11-20): Day Planner on the
  Linux phone and Super Productivity with the plugin on the desktop are
  the owner's apps ([roadmap](../roadmap.md)). The standalone app is for
  people with neither, and it has no users yet to ask for a store.
- **Android already installs the PWA**: Chrome offers "Install app" for
  a page with a valid manifest and service worker, which `e2e/pwa.mjs`
  checks in CI. An APK would add a WebView shell (Capacitor or a
  Trusted Web Activity), a signing key held as a secret, an emulator job
  and store upkeep, for the same screens.
- **Reminders** are the one thing an APK would add. QuestArc's reminders
  are the host's task reminders, said to fade (design rule 23,
  [game rules](../game-rules.md) §9); a web app cannot fire them while
  closed without a push server, which the no-network rule excludes. So
  the PWA shows none, as the plugin shows only Super Productivity's.
- **Automatic local backups**: a page cannot write a file without the
  user's action on Android, and a second copy in the same browser
  storage is lost together with the first. What protects the data is
  already there: the app asks for persistent storage once the first
  habit exists (`store/persist.ts`) and offers the export on the Data
  screen, which Super Productivity and Day Planner import.
- **Sync folder** (step 8) waits on Day Planner's own sync work, as the
  plan said.

## When to come back to it

- An APK and F-Droid: when people ask for the app outside the browser,
  or reminders become possible without a server. Google Play needs the
  owner's developer account and identity checks
  ([owner checks](../owner-checks.md)).
- Automatic backups: if lost data is reported despite persistent
  storage.

## Consequences

- #91 is closed with the PWA. The Cloudflare secrets and the domain stay
  the owner's steps ([PWA release](../pwa-release.md#the-owners-steps),
  [owner checks](../owner-checks.md)).
- App tags (`app-v<version>`) are not needed until an APK exists.
