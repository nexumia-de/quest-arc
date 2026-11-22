import type { KeptJourney } from '@questarc/engine';

import type { QuickForm, QuickResult } from '../adapter/brain';
import type { ContentPack, State } from '../shared/protocol';

/**
 * How the screens reach the game: the state derived from the host's data,
 * writing choice records, and the texts and pictures. The plugin's view
 * talks to plugin.js by messages (packages/plugin/src/ui/client.ts), the
 * standalone app asks its brain directly.
 */
export interface Client {
  get(): Promise<State>;
  write(records: Record<string, unknown>): Promise<State>;
  content(): Promise<ContentPack>;
  /** Checks a journey file of the user's before it is kept (#40). */
  checkJourney(journey: unknown): Promise<KeptJourney>;
  /** The journey of the quick form's answers, built and checked by the host (#89). */
  quick(answers: QuickForm): Promise<QuickResult>;
  /** Only the plugin has a side panel; without it the setting is not shown. */
  sidePanel?(on: boolean): Promise<State>;
  /** Asks the host to save a file for the user (the plugin: through plugin.js, #40). */
  saveFile?(name: string, text: string): Promise<State>;
}
