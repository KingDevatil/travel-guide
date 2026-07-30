// Vitest DOM matchers
import "@testing-library/jest-dom/vitest";

// Fake IndexedDB for tests — must import before any Dexie code runs
import "fake-indexeddb/auto";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(String(key)); },
    setItem: (key, value) => { values.set(String(key), String(value)); },
  };
}

// Node 25 exposes an incomplete global localStorage when no backing file is
// configured. jsdom then inherits it, so install the browser contract explicitly.
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: createStorage(),
});

if (typeof HTMLCanvasElement !== "undefined") {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => null,
  });
}
