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

// Mock do ResizeObserver e getBoundingClientRect para compatibilidade com jsdom e Recharts
if (typeof globalThis !== 'undefined' && !globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof Element !== 'undefined' && !Element.prototype.getBoundingClientRect.__mocked) {
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 500,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    };
  };
  Element.prototype.getBoundingClientRect.__mocked = true;
}
