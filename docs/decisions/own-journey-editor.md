---
type: Decision Record
title: No editor for journeys of your own for now
description: The quick form, export and import cover changing a journey of your own; a full editor (#89, step 2) is not built until real use asks for it.
tags: [decision, journeys, own-journeys, ui]
generated: { by: claude-code/2.1.330, at: 2026-11-22 }
---

# No editor for journeys of your own for now

Issue #89 planned two steps: the quick form first, then an editor for
every field of a journey of your own (texts, conditions, stories,
nuggets, the build). Decided by best practice on 2026-11-22, as the
owner asked for open "needs decision" points.

## Decision

The quick form ships (screen 2a), together with export, import and
removal of a journey file (#40, screen 2b). A full editor is not built
now.

## Why

- **What it would change is already reachable.** A journey of your own
  can be exported, changed as a file (by hand or with an agent along
  [Writing a journey](../authoring-journeys.md)) and imported again; the
  same journey checker runs. A quick journey can also be made again from
  the form in a minute.
- **What was walked must stay as it was.** Changing a journey a run
  walks would alter what was earned; the import already refuses that
  and asks for another id. An editor would need the same split (texts
  and what lies ahead editable, the rest a new version), which is the
  largest part of its work and of its risk.
- **Size.** The plugin's view has about 10 KB left of Super
  Productivity 19.3's 100 KB limit
  ([decision](one-build-for-older-versions.md)); an editor for every
  field does not fit without moving more of the view into `plugin.js`.
- **No evidence of need yet.** The design rules ask for the user's own
  words in the anchor and the action (rules 2 and 5), which the form
  covers. Whether people want to rewrite stories and nuggets is open
  until the look back ([owner checks](../owner-checks.md), #84).

## Consequences

- #89 is closed with the quick form; an editor becomes its own issue
  only if the look back or users ask for it.
- Day Planner follows the same scope (pensum#80).
