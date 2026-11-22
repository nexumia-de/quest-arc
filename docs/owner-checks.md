---
type: Checklist
title: Checks only the owner can do
description: What is left of closed issues that needs the owner's account, device, secret, own use over weeks or an upstream project; agents prepared everything else.
tags: [owner, checklist, plan]
generated: { by: claude-code/2.1.330, at: 2026-11-22 }
---

# Checks only the owner can do

Issues are closed when everything an agent can do is done: code, tests
and documents. What is left needs the owner's account, a real device, a
secret, the owner's own use over weeks or an upstream project, and is
collected here, one section per issue. No agent has done any of these
checks; tick them here when they are done.

## #41 Plugin API for repeat configs (upstream)

Super Productivity's plugin API still cannot create repeat configs
(`@super-productivity/plugin-api` 20.0.0 has `PluginTaskRepeatCfg` for
reading only). The plugin keeps the hand-over of
[recurring-task setup](decisions/recurring-task-setup.md); the upstream
request is super-productivity/super-productivity#9528.

- [ ] 👍 on super-productivity/super-productivity#9528, under your
      account.
- [ ] A short comment there with QuestArc's use case: a plugin sets up
      the recurring task the user just chose for a habit stage; today it
      can only hand the task over for the user to set the repeat by hand.
- [ ] Only if the maintainer asks for it: a small pull request,
      announced first.
- [ ] When a release has the methods: open an issue here to create the
      repeat config from the plugin, with the hand-over kept for older
      versions.

## #84 Look back at the numbers after eight weeks of daily use

The agent part is on main: `scripts/look-back.mjs` (commit `2a79abc`,
[development](development.md)) reads a Super Productivity backup and
prints, per stage, due days, completions, gaps, run-ending misses, days
from acceptance to met, backfill use and the weekly answers, ids and
counts only. Earliest eight weeks after the first real journey started:

- [ ] Run `node scripts/look-back.mjs <backup.json>` on an export.
- [ ] Condition `days` 5 of 7: too easy, too hard, right?
- [ ] One-day backfill window: used, enough?
- [ ] Did a stage grow too early (stay or skip, #81)?
- [ ] Weekly question: answered or skipped? Does the answer move?
- [ ] Welcome back and the hard-week hint: helpful or noise?
- [ ] Does the build (the thing at a place) add anything after the first
      weeks?
- [ ] Graduation thresholds (three answers of 6–7, 80 %): plausible
      against your own data?
- [ ] Are keepsakes as a page missed, beyond the one sentence in the
      weekly look back (#87)? Is a companion missed (#43, closed as not
      planned; reopen only if yes)?
- [ ] Each change that follows: one issue that changes the rule, its
      vectors and the code together.

## #91 Standalone app: the PWA on its own domain

Everything up to the installable, offline PWA and its deploy job is on
main; the APK and stores wait ([decision](decisions/standalone-app-after-pwa.md)).
The deploy needs the owner's account ([PWA release](pwa-release.md#the-owners-steps)):

- [ ] A Cloudflare API token (Workers Scripts: Edit; for `nexumia.de`
      Workers Routes: Edit and DNS: Edit).
- [ ] Repository secrets `CLOUDFLARE_API_TOKEN` and
      `CLOUDFLARE_ACCOUNT_ID`.
- [ ] Confirm `questarc.nexumia.de` or name another domain.
- [ ] After the next push to `main`: open the app on an Android phone,
      install it from the browser, start a journey, tick it off offline.
