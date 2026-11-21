import { h } from '@questarc/ui/ui/dom';

import {
  APPEARANCES,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Appearance,
  type LanguageChoice,
} from '../preferences';
import { at } from '../texts';

/**
 * Data (#93): the dataset as a backup file, out and in, the one setting
 * the day needs, and the app's language and light or dark (#165;
 * docs/behaviour.md "Data").
 */

export interface DataProps {
  /** The day start as `HH:MM`. */
  readonly dayStart: string;
  readonly setDayStart: (time: string) => void;
  readonly exportBackup: () => void;
  readonly importBackup: (file: File) => void;
  readonly language: LanguageChoice;
  readonly setLanguage: (choice: LanguageChoice) => void;
  readonly appearance: Appearance;
  readonly setAppearance: (choice: Appearance) => void;
}

/** One choice of a few: a labelled native list, which every platform shows its own way. */
const choice = <T extends string>(
  id: string,
  label: string,
  options: readonly (readonly [T, string])[],
  chosen: T,
  set: (value: T) => void,
): Node =>
  h(
    'label',
    { class: 'app-field' },
    h('span', { class: 'qa-section-title' }, label),
    h(
      'select',
      {
        id,
        class: 'app-input',
        onchange: (event: Event) => set((event.target as HTMLSelectElement).value as T),
      },
      ...options.map(([value, name]) => h('option', { value, selected: value === chosen }, name)),
    ),
  );

export const renderData = (root: HTMLElement, props: DataProps): void => {
  const file = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: (event: Event) => {
      const input = event.target as HTMLInputElement;
      const chosen = input.files?.[0];
      if (chosen) props.importBackup(chosen);
      input.value = '';
    },
  }) as HTMLInputElement;
  const button = (label: string, onclick: () => void) =>
    h('button', { class: 'qa-btn qa-btn-secondary', type: 'button', onclick }, label);

  // A redraw after a choice keeps the keyboard's place on its field.
  const focused = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
  root.replaceChildren(
    h(
      'header',
      { class: 'qa-header app-header' },
      h('h1', { class: 'qa-title' }, at('data.title')),
    ),
    h(
      'main',
      { class: 'qa-main' },
      h(
        'div',
        { class: 'qa-stack' },
        h('p', {}, at('data.text')),
        h(
          'section',
          { class: 'qa-card qa-stack' },
          button(at('data.export'), props.exportBackup),
          button(at('data.import'), () => file.click()),
          h('p', { class: 'qa-muted qa-small' }, at('data.import.text')),
          file,
        ),
        h(
          'section',
          { class: 'qa-card qa-stack' },
          h(
            'label',
            { class: 'app-field' },
            h('span', { class: 'qa-section-title' }, at('data.day-start')),
            h('input', {
              type: 'time',
              class: 'app-input',
              value: props.dayStart,
              onchange: (event: Event) => {
                const { value } = event.target as HTMLInputElement;
                if (value) props.setDayStart(value);
              },
            }),
          ),
          h('p', { class: 'qa-muted qa-small' }, at('data.day-start.text')),
        ),
        h(
          'section',
          { class: 'qa-card qa-stack' },
          choice(
            'app-language',
            at('data.language'),
            [
              ['device', at('data.language.device')],
              ...LANGUAGES.map((code) => [code, LANGUAGE_NAMES[code]] as const),
            ],
            props.language,
            props.setLanguage,
          ),
          choice(
            'app-appearance',
            at('data.appearance'),
            APPEARANCES.map((mode) => [mode, at(`data.appearance.${mode}`)] as const),
            props.appearance,
            props.setAppearance,
          ),
          h('p', { class: 'qa-muted qa-small' }, at('data.preferences.text')),
        ),
      ),
    ),
  );
  if (focused) root.querySelector<HTMLElement>(`#${focused}`)?.focus();
};
