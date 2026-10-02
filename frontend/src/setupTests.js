import '@testing-library/jest-dom';

// Node 26 exposes an experimental global localStorage that evaluates to undefined without --localstorage-file.
// We map globalThis.localStorage to jsdom's window.localStorage for reliable test execution.
if (typeof window !== 'undefined' && window.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: window.localStorage,
    writable: true,
    configurable: true,
  });
}
