/**
 * Asks the browser to keep the app's data: IndexedDB of a site that is
 * not installed can be evicted. Asked once, when the first habit exists
 * (at start or right after it is created); no message, errors and a
 * browser without the call are ignored. The call is not a network request.
 */

export interface PersistentStorage {
  persist?: () => Promise<boolean>;
}

export const keepDataOnce = (
  storage: PersistentStorage | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.storage,
): ((hasHabits: boolean) => void) => {
  let asked = false;
  return (hasHabits) => {
    if (asked || !hasHabits) return;
    asked = true;
    try {
      void Promise.resolve(storage?.persist?.()).catch(() => undefined);
    } catch {
      // not available here
    }
  };
};
