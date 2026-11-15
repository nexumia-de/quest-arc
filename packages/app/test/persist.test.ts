import { describe, expect, it, vi } from 'vitest';

import { keepDataOnce } from '../src/store/persist';

describe('asking the browser to keep the data', () => {
  it('asks once, and only when a habit exists', () => {
    const persist = vi.fn(async () => true);
    const keep = keepDataOnce({ persist });
    keep(false);
    expect(persist).not.toHaveBeenCalled();
    keep(true);
    keep(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('ignores errors and a browser without the call', async () => {
    const failing = keepDataOnce({ persist: () => Promise.reject(new Error('no')) });
    expect(() => failing(true)).not.toThrow();
    const throwing = keepDataOnce({
      persist: () => {
        throw new Error('no');
      },
    });
    expect(() => throwing(true)).not.toThrow();
    expect(() => keepDataOnce({})(true)).not.toThrow();
    expect(() => keepDataOnce(undefined)(true)).not.toThrow();
    await Promise.resolve();
  });
});
