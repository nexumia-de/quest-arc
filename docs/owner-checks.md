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
