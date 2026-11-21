import { language } from '@questarc/ui/shared/texts';

/**
 * The texts only the standalone app has; the journeys' screens bring
 * their own (content/i18n). German next to English (issue #39); the
 * language is the one the app chose at start (main.ts), English for
 * any other.
 */
const english = {
  'tab.today': 'Today',
  'tab.journey': 'Journey',
  'tab.data': 'Data',
  'today.empty': 'Nothing is due today.',
  'today.none': 'Your habits come from a journey: each stage adds one small habit here.',
  'today.open-journey': 'Open the Journey',
  'today.earlier': 'from {day}',
  'today.done': 'Done',
  'today.open': 'Not done yet',
  'today.other': 'Without a moment',
  'today.left': 'Left out today',
  'today.left.done': 'Left out for today.',
  'today.more': 'More',
  'today.more.of': 'More about {title}',
  'today.wont-do': 'Won’t Do Today',
  'today.habit': 'About This Habit',
  'today.resting': 'Not today',
  'habit.paused': 'Paused',
  'habit.schedule': 'Schedule',
  'habit.schedule.now': 'Now: {schedule}',
  'habit.schedule.every': 'Every few days',
  'habit.schedule.weekdays': 'On chosen weekdays',
  'habit.schedule.none': 'A weekly schedule needs at least one weekday.',
  'habit.schedule.text': 'The journey then looks at its days by the new schedule.',
  'habit.schedule.fixed': 'This task has a reminder time, so its schedule stays as it is here.',
  'habit.schedule.save': 'Save Schedule',
  'habit.schedule.saved': 'Schedule changed.',
  'habit.pause.title': 'Pause',
  'habit.pause.text': 'While paused no tasks are made, and paused days don’t count.',
  'habit.pause': 'Pause',
  'habit.resume': 'Resume',
  'habit.pause.done': 'Paused.',
  'habit.resume.done': 'Resumed.',
  'habit.next.title': 'Next time',
  'habit.next': 'Next time: {day}',
  'habit.next.none': 'No next time within a month.',
  'habit.leave-out': 'Leave Out That Day',
  'habit.leave-out.text': 'A day you leave out ahead is not due. It is not a gap.',
  'habit.leave-out.done': '{day} is left out.',
  'habit.left-out': 'Left out: {day}',
  'habit.take-back': 'Take Back',
  'data.title': 'Data',
  'data.text':
    'Your habits and your journey are kept on this device, in the format of Super Productivity’s backups. A backup file can be imported there, and one from there here.',
  'data.export': 'Export a Backup',
  'data.import': 'Import a Backup',
  'data.import.text': 'Importing replaces everything in this app.',
  'data.imported': 'Backup imported.',
  'data.undo': 'Undo',
  'data.restored': 'Your data from before the import is back.',
  'data.problem.not-json': 'This file is not a backup: it could not be read.',
  'data.problem.not-a-backup': 'This file is not a backup of Super Productivity or of this app.',
  'data.problem.other-version':
    'This backup has another data version. Open it in a current Super Productivity and export it again.',
  'data.day-start': 'A day starts at',
  'data.day-start.text':
    'What you tick off before this time counts for the day before, for people who are up after midnight.',
  'data.language': 'Language',
  'data.language.device': 'Follow Device',
  'data.appearance': 'Appearance',
  'data.appearance.system': 'Follow System',
  'data.appearance.light': 'Light',
  'data.appearance.dark': 'Dark',
  'data.preferences.text':
    'Both choices are kept on this device only. They are not part of a backup.',
  'error.start': 'The app could not open its data on this device.',
} as const;

type Key = keyof typeof english;

const german: Readonly<Record<Key, string>> = {
  'tab.today': 'Heute',
  'tab.journey': 'Reise',
  'tab.data': 'Daten',
  'today.empty': 'Heute ist nichts fällig.',
  'today.none':
    'Deine Gewohnheiten kommen aus einer Reise: Jeder Schritt bringt eine kleine Gewohnheit hierher.',
  'today.open-journey': 'Reise öffnen',
  'today.earlier': 'vom {day}',
  'today.done': 'Erledigt',
  'today.open': 'Noch offen',
  'today.other': 'Ohne Moment',
  'today.left': 'Heute ausgelassen',
  'today.left.done': 'Für heute ausgelassen.',
  'today.more': 'Mehr',
  'today.more.of': 'Mehr zu {title}',
  'today.wont-do': 'Heute auslassen',
  'today.habit': 'Zur Gewohnheit',
  'today.resting': 'Nicht heute',
  'habit.paused': 'Pausiert',
  'habit.schedule': 'Rhythmus',
  'habit.schedule.now': 'Jetzt: {schedule}',
  'habit.schedule.every': 'Alle paar Tage',
  'habit.schedule.weekdays': 'An bestimmten Wochentagen',
  'habit.schedule.none': 'Ein Wochenrhythmus braucht mindestens einen Wochentag.',
  'habit.schedule.text': 'Die Reise schaut dann nach dem neuen Rhythmus auf ihre Tage.',
  'habit.schedule.fixed':
    'Diese Aufgabe hat eine Erinnerungszeit, deshalb bleibt ihr Rhythmus hier, wie er ist.',
  'habit.schedule.save': 'Rhythmus speichern',
  'habit.schedule.saved': 'Rhythmus geändert.',
  'habit.pause.title': 'Pause',
  'habit.pause.text':
    'Solange pausiert ist, entstehen keine Aufgaben, und pausierte Tage zählen nicht.',
  'habit.pause': 'Pausieren',
  'habit.resume': 'Fortsetzen',
  'habit.pause.done': 'Pausiert.',
  'habit.resume.done': 'Fortgesetzt.',
  'habit.next.title': 'Nächstes Mal',
  'habit.next': 'Nächstes Mal: {day}',
  'habit.next.none': 'Kein nächstes Mal innerhalb eines Monats.',
  'habit.leave-out': 'Diesen Tag auslassen',
  'habit.leave-out.text':
    'Ein Tag, den du im Voraus auslässt, ist nicht fällig. Er ist keine Lücke.',
  'habit.leave-out.done': '{day} ist ausgelassen.',
  'habit.left-out': 'Ausgelassen: {day}',
  'habit.take-back': 'Zurücknehmen',
  'data.title': 'Daten',
  'data.text':
    'Deine Gewohnheiten und deine Reise liegen auf diesem Gerät, im Format der Backups von Super Productivity. Eine Backup-Datei lässt sich dort importieren, und eine von dort hier.',
  'data.export': 'Backup exportieren',
  'data.import': 'Backup importieren',
  'data.import.text': 'Ein Import ersetzt alles in dieser App.',
  'data.imported': 'Backup importiert.',
  'data.undo': 'Rückgängig',
  'data.restored': 'Deine Daten von vor dem Import sind wieder da.',
  'data.problem.not-json': 'Diese Datei ist kein Backup: Sie ließ sich nicht lesen.',
  'data.problem.not-a-backup':
    'Diese Datei ist kein Backup von Super Productivity oder von dieser App.',
  'data.problem.other-version':
    'Dieses Backup hat eine andere Datenversion. Du könntest es in einem aktuellen Super Productivity öffnen und neu exportieren.',
  'data.day-start': 'Ein Tag beginnt um',
  'data.day-start.text':
    'Was du vor dieser Zeit abhakst, zählt für den Tag davor: für alle, die nach Mitternacht noch wach sind.',
  'data.language': 'Sprache',
  'data.language.device': 'Wie das Gerät',
  'data.appearance': 'Darstellung',
  'data.appearance.system': 'Wie das System',
  'data.appearance.light': 'Hell',
  'data.appearance.dark': 'Dunkel',
  'data.preferences.text': 'Beides bleibt nur auf diesem Gerät und gehört nicht zum Backup.',
  'error.start': 'Die App konnte ihre Daten auf diesem Gerät nicht öffnen.',
};

const tables: Readonly<Record<string, Readonly<Record<Key, string>>>> = { en: english, de: german };

export const at = (key: Key, params: Record<string, string> = {}): string =>
  (tables[language()] ?? english)[key].replace(
    /\{([a-z]+)\}/g,
    (match, name: string) => params[name] ?? match,
  );
