# Changelog

Changes that users notice, newest first. Versions follow the plugin's
`manifest.json`; each version is a
[GitHub release](https://github.com/nexumia-de/quest-arc/releases) with the
plugin ZIP.

## 4.3.1

- Day Planner can save the kind of thing chosen at a moment: the engine
  now answers the new choices from other hosts too.

## 4.3.0

- **Choose what stands at a moment.** A journey suggests its kind of
  thing; under **Change this moment** you can pick another kind, also
  after it has grown. It keeps the version it has reached. **Use the
  suggestion** brings back the journey's own.

## 4.2.0

- **Your day as a valley.** QuestArc opens on one path through your day,
  morning at the top and night at the bottom. Each of your moments is a
  place along it, with the thing its routine builds. The step that is
  growing now is a card below the valley.
- **A page for every place.** Tap a place to see its thing, the versions
  that stand and its routine in words. The pencil opens **Change this
  moment**: its words, earlier or later in your day, the side of the
  path and its colour.
- **More journeys at one moment.** A further journey at the same moment
  builds another thing of the same kind beside the first, up to three.
- **Flowers show the way to the next station.** One flower grows for each
  good day. When the routine runs by itself, a lantern is lit at its
  place.
- What comes next is no longer shown in advance; the row shows what
  stands.

## 4.1.0

- **Three new things to build:** a Garden, a Well and a Lookout, each
  growing in five versions that keep what stands and add to it.
- **Journeys build new things:** _A walk after lunch_ builds a Lookout,
  _Evening wind-down_ and _Tidy a little_ a Garden, _First Things First_
  and _A gentle morning_ a Well; _A few pages before sleep_ keeps its
  Home. The Crossing over the river is retired.

## 4.0.0

- **Start from the moments in your day.** You name a moment in your own
  words ("after my first coffee", "at 21:30"), and journeys add one step
  to it. QuestArc opens on your moments, each with the one step that is
  growing there; the journey and what it builds open from it. A journey
  you started earlier asks once whether its moment is yours.
- **A habit that runs by itself can graduate.** When the weekly question
  says it has become automatic and you do it steadily, QuestArc offers
  to stop following it. It then stands at its moment without a box to
  tick, QuestArc asks now and then whether it still runs by itself, and
  you can bring it back at any time without losing anything. "Not Now"
  is remembered on all your devices; the offer returns after four weeks
  at the earliest.
- **Stay at a stage, or pass one you already do.** A reached station
  offers **Continue** and **Stay Here a While** as equals; your latest
  weekly answer suggests one. A station whose step is already part of
  your day can be passed with **I Already Do This**.
- **Coming back after a long break.** After two weeks without a
  completion, one calm card lets you carry on, call the time a pause, or
  start again with the smaller step before. What you built stays.
- **QuestArc speaks German** when Super Productivity is set to German.
- **Four new journeys:** _Evening wind-down_, _Tidy a little_, _A walk
  after lunch_ and _A few pages before sleep_.
- **Pair a step with something you enjoy**, like a podcast; it becomes
  part of your plan sentence and stays with you from step to step.
- **An optional plan check** when you start a journey: your wish, the
  best outcome, the main obstacle and your plan for it. Your plan for the
  obstacle comes back in a hard week.
- **Reminders:** QuestArc suggests a reminder on your task for the first
  weeks and tells you when you may not need it any more. It never sets or
  removes one itself. A habit graduates only once its task has had no
  reminder for two weeks.
- The weekly look back shows your answers so far, week by week; the
  shelf shows the last days and the run of the habits that stay after a
  journey. After a journey the weekly question comes weekly for eight
  weeks, then every four weeks.
- The settings button next to QuestArc in Super Productivity's plugin
  list opens QuestArc's settings.
- When you build something other than a journey suggests, the versions
  are named after what you build.
- Compatibility: QuestArc 4.0.0 still runs on Super Productivity 19.3.0
  and later. Journeys you continue with 4.0.0 can only be read with an
  older QuestArc, or in Day Planner before its update, until you update
  there. Nothing is lost.

## 3.3.0

- **One look: every journey builds something.** The choice between
  "Calm" and "With game" is gone. Every journey now shows what it builds;
  the stations are a list under **Stations** in the menu, and the drawn
  path is removed.
- **No XP, levels or guardians any more.** They had no effect since
  3.2.0. Messages say your real progress in words ("Drink a glass of
  water: done. 4 of 5 days.") and always offer **Show**.
- The stories of _A gentle morning_ and _First Things First_ are
  rewritten to fit building, without opponents.
- A journey you continue with 3.3.0 can only be read on a device with an
  older QuestArc until you update it there. Nothing is lost.
- For journey authors: a `guardian` in a stage is refused by the checker.

## 3.2.1

- After you switch QuestArc off or install a new version, the old one
  no longer checks your tasks one more time in the background.

## 3.2.0

- **With the game, a journey now builds something.** Instead of the path
  the journey screen shows one thing that is whole at every station and
  becomes a larger version with the next: _A gentle morning_ grows from a
  fireplace to a house, _First Things First_ from stepping stones to a
  covered bridge. While you work on a station, a line of lanterns,
  pennants or flowers grows in front of it and lights up when the station
  is ready. Nothing is ever taken down. Calm mode keeps the path; with
  the game it is under **Stations** in the menu.
- When you start a journey with the game you can change what it builds,
  what hangs on the line and the colour; later under **What you build**
  in the menu.
- With the game, the message after completing the journey's task has a
  **Show** button that opens the journey screen, where the new piece
  appears.
- A journey that was continued with a newer QuestArc on another device
  is shown read-only instead of being changed by the older one.

## 3.1.0

- New journey **First Things First**, for work: on workdays, from writing
  down the one task that matters most to 45 quiet minutes on it, email
  and chat in one block and a short look back at yesterday.
- Journeys written by others show their author ("Written by …") in the
  list and the preview. Anyone can write a journey, alone or with an AI
  agent, and publish it by pull request; see
  [Writing a journey](docs/authoring-journeys.md).

## 3.0.1

- Clearer messages when QuestArc cannot load: "QuestArc is starting"
  while Super Productivity is still loading it (after starting the app,
  an update or switching it on), "QuestArc is not running" with what to
  check, and the reason when reading your data failed. The message now
  goes away as soon as QuestArc answers, and it spans the whole width
  above the journey.
- One icon everywhere: the side menu and the page header now show the
  same route icon as the button at the top right, instead of a drawn
  icon that looked like a blob.
- In dark mode the unselected choice ("With game", start day) no longer
  shows as a white disc.

## 3.0.0

A new start: QuestArc 3.0 is rebuilt from scratch and does not read 2.x
quests ([coming from 2.x](README.md#coming-from-questarc-2x)). Needs
Super Productivity 19.3.0 or newer.

- Habits as a journey: a path of small stations, each one a habit step
  anchored to a moment, with the first built-in journey _A gentle
  morning_.
- Start a journey with your own reason and a start day; QuestArc creates
  the station's task or uses an existing recurring task, and you set the
  repeat in Super Productivity.
- Progress comes from your ticked-off tasks: the last seven due days, runs,
  a message after each completion, and the next station's story when a
  station is reached.
- Missed days are neutral gaps; a hard week offers the earlier step;
  journeys can be paused, resumed and ended with Undo.
- Weekly look back with one question about how automatic the habit has
  become; welcome back after a gap; a learning nugget at each station.
- Calm mode by default; the optional game layer adds XP, levels and
  guardians.
- Shelf with waiting journeys, habits that stay and finished journeys.
- The page "How QuestArc motivates you", and a setting that removes
  QuestArc's data while your tasks stay.
- Works at phone size (360 px) and on the desktop, in light and dark.
