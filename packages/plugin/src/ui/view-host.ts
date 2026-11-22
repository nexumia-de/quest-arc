import type { Client } from '@questarc/ui/ui/client';
import type { ViewHost } from '@questarc/ui/ui/view-host';

/**
 * The screens' host in Super Productivity's plugin iframe: the global
 * `PluginAPI` the shim injects. The plugin cannot create a repeat, so
 * there is no `createHabit`; a task is made without short syntax, so the
 * title stays as QuestArc wrote it. A file is saved by plugin.js: the
 * view's shim does not pass `downloadFile` on (docs/super-productivity-facts.md §1).
 */
export const createViewHost = (client: Pick<Required<Client>, 'saveFile'>): ViewHost => ({
  getAppState: () => PluginAPI.getAppState(),
  selectTask: (taskId) => PluginAPI.selectTask(taskId),
  addTask: ({ title }) => PluginAPI.addTask({ title, isIgnoreShortSyntax: true }),
  saveFile: async (name, text) => {
    await client.saveFile(name, text);
  },
});
