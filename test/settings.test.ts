import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSetting, writeSetting} from '../src/settings.ts';

/** @param storage what globalThis.localStorage is, for one test */
function withStorage(storage: PropertyDescriptor, run: () => void) {
  Object.defineProperty(globalThis, 'localStorage', {...storage, configurable: true});
  try {
    run();
  }
  finally {
    delete (globalThis as any).localStorage;
  }
}

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => m.set(k, v),
  };
}

test('a setting written is read back, as a string', () => {
  withStorage({value: memoryStorage()}, () => {
    assert.equal(readSetting('app.test'), null);
    writeSetting('app.test', 15);
    assert.equal(readSetting('app.test'), '15');
    writeSetting('app.test', false);
    assert.equal(readSetting('app.test'), 'false');
  });
});

test('without storage, nothing is remembered and nothing fails', () => {
  // a private window, or site data blocked: reading localStorage throws
  withStorage({get() { throw new Error('SecurityError'); }}, () => {
    writeSetting('app.test', 'x');
    assert.equal(readSetting('app.test'), null);
  });
  // no storage at all
  writeSetting('app.test', 'x');
  assert.equal(readSetting('app.test'), null);
});
