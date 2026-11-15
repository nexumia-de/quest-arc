---
type: Decision Record
title: Everything stays free and open; a paid Google Play build and a support link
description: QuestArc's code stays AGPL and its journeys and pictures CC BY-SA, all of them free. The standalone app is free on GitHub releases and F-Droid and paid on Google Play with the same code and content; a quiet support link leads to Liberapay. A shop for journeys, paid sync and a paid editor were rejected.
tags: [decision, funding, licence, stores, donations, standalone-app]
generated: { by: claude-code/2.1.325, at: 2026-11-15 }
sources:
  - id: issue118
    title: 'Funding: decision record (#118), decided by the owner on 2026-11-15'
    url: https://github.com/nexumia-de/quest-arc/issues/118
  - id: support
    title: 'Support link of the nexumia-de apps (phosh-toolkit)'
    url: https://github.com/nexumia-de/phosh-toolkit/blob/main/docs/support.md
---

# Everything stays free and open; a paid Google Play build and a support link

## Context

QuestArc is free software (AGPL-3.0-or-later) with free content
(CC BY-SA 4.0, [journeys by pull request](journeys-by-pull-request.md),
[shared pictures](shared-pictures.md)). The owner wants it to stay a
thing for everyone, and those who like it should have a way to support
the work[^issue118].

## Decision

Nothing in QuestArc is held back for payment. Who wants to support the
work can buy the app on Google Play or donate (owner,
2026-11-15[^issue118]).

| Thing                                                         | How it is offered                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Code: engine, UI, plugin, app, later the journey editor (#89) | AGPL-3.0-or-later, as before                                                       |
| Journeys and pictures (`content/`)                            | CC BY-SA 4.0, as before; all of them free                                          |
| Plugin for Super Productivity                                 | free, on GitHub releases                                                           |
| Standalone app: PWA, APK on GitHub releases, F-Droid (#122)   | free                                                                               |
| Standalone app on Google Play (#123)                          | **paid** once at download; the same code and content as the free builds            |
| Donations                                                     | `https://liberapay.com/suitably`, the link the nexumia-de Phosh apps use[^support] |

## Rules that follow

1. **No build has a feature another build lacks.** Paying on Google
   Play buys the same app: no licence check, no Play-only feature, no
   in-app purchase, no subscription, no billing library.
2. **Support is named only where a user goes on their own**: the About
   card at the end of Settings ([behaviour](../behaviour.md) §8, #119),
   the README, `.github/FUNDING.yml` and the store descriptions (#121).
   No banner, message, badge or dialog in any other screen names it, at
   no time and after no event.
3. **Super Productivity's name.** Texts may say as a fact that QuestArc
   works with Super Productivity and uses its backup format. The name is
   not part of the app's title, and no text suggests endorsement.
4. **Copyright of contributions.** A journey sent by pull request stays
   its author's under CC BY-SA 4.0. Before the first code contribution
   from outside is merged, the owner decides whether a contributor
   agreement is wanted.

## Rejected

- **A shop for journeys or builds.** A person works on two to four
  habits at a time and a journey runs for weeks or months, so each user
  needs few journeys and the catalogue has a natural end (#124). A shop
  would need a licence split for content, a payment setup and content
  kept outside this repository, against the wish to keep everything
  open.
- **Paid sync.** The data is Super Productivity's backup format and sync
  is planned along Super Productivity's own sync (#91, step 8). A
  service of our own would be a second sync or the hosting of someone
  else's server, with the duties of a data processor for personal habit
  data, and it would break the no-network rule.
- **A paid editor.** The editor (#89) is what lets others write
  journeys.
- **What the [design rules](../psychology.md) forbid**: paid streak
  repair, random rewards, premium prompts, ads, telemetry.

## Consequences

- The [standalone app](standalone-app.md) names its stores: GitHub
  releases and F-Droid free, Google Play paid.
- A [privacy statement](../privacy.md) is needed for the store listings
  (#120).
- The paid listing needs the owner: a developer account and a price
  (#123).

[^issue118]: Funding: decision record (#118), https://github.com/nexumia-de/quest-arc/issues/118

[^support]: Support link of the nexumia-de apps, https://github.com/nexumia-de/phosh-toolkit/blob/main/docs/support.md
