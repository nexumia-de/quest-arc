---
type: Decision Record
title: The Valley, one path through the day
description: The owner's decisions of #114 in their final form (2026-11-15/16): the Valley is the home, one path from morning to night, a place per moment with up to three things of one kind, the lit lantern as the only sign, flowers as the default marker, layout by rule.
tags: [decision, valley, ui, art]
generated: { by: claude-code/2.1.330, at: 2026-11-22 }
---

# The Valley, one path through the day

The owner's decisions from the design session of 2026-11-15, written in
issue #114 and changed in its comments; later comments override earlier
ones. This record holds their final form; the rules themselves are in
[journey design](../journey-design.md), [game rules](../game-rules.md) §8
and [behaviour](../behaviour.md), screens 0 and 0b.

## Decision

1. **The Valley is the home.** It replaces the list of moments and draws
   the engine's `anchors`; no extra screen, no optional layer.
2. **One path through the day**, morning at the top and night at the
   bottom; it enters at the top and leaves at the bottom. No start, no
   goal, no circle, no water.
3. **A place is a moment**, in the user's words, in the order of the
   day; the journey's daypart gives the default position, the user can
   move it earlier or later.
4. **One moment, one routine.** A journey is the routine of one moment;
   its thing takes its next version, whole, when a station is finished.
   Staying at a station is fine.
5. **Up to three things of the same kind** at a place (final form of
   decision 5, 2026-11-15): a further journey from the same moment
   builds a second, then a third thing of the first journey's kind,
   standing behind the first; a fourth journey builds none and is shown
   in words. No surroundings.
6. **Signs and markers** (2026-11-15/16): the lit lantern, when the
   routine runs by itself, is the only sign at a place; flowers growing
   one per good day are the default marker, and "What hangs" may offer
   other marker kinds that are not flags or lights. The kind of thing is
   a choice per place, changeable after it has grown (#158).
7. **Nothing announced**: a free place is plain land; nothing decays,
   nothing can be bought or sped up.
8. **Layout by rule, not by hand**: things alternate sides, the path
   winds more with more places, six places fill 360 × 720, more scroll.
   The place piece (bend, bay, slot, name) is computed and checked
   (`valleyLayout`, `valleyProblems`).
9. **Colours** from the host's theme; the ground is the place's hue
   mixed lightly into the background; names keep 4.5 : 1 on tinted
   ground for every hue, light and dark.
10. **Placing is choice records** (`place:<anchorId>`), not dragging.
11. **Things**: Home, Garden, Well, Lookout; Crossing retired.
12. **Screens**: the Valley; the place; what you build; change this
    moment. A place never opens by itself.
13. **Not now**: the travel companion (#43, since closed as
    [not planned](no-companion.md)), keepsakes as a page (#87, now one
    sentence), a shop.

## Where it was built

The sub-issues of #114, all closed: the engine's valley and place
record (#126, #148, #149), the place piece by rule (#127, #151), the
things (#128, #135), the Valley as home (#129), the place, the kit and
"Change this moment" (#130), the lantern (#131), flowers (#152) and the
choices per place (#158), released from 4.1.0 to 4.3.1
([changelog](../../CHANGELOG.md)).

## Consequences

- The rough mockups of the session are with the owner; adding them as
  `docs/screenshots/valley-mock-*.png` is on the owner's list
  ([owner checks](../owner-checks.md)). Screenshots of the built Valley
  with one, three and six places are in `docs/screenshots/valley-*.png`.
