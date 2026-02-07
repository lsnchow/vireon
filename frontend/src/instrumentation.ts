/**
 * Next.js Instrumentation Hook
 * Runs before any other code during server startup.
 * Fixes broken Node.js localStorage polyfill (--localstorage-file with invalid path).
 */

export async function register() {
  if (typeof window === 'undefined') {
    // Fix broken localStorage if it exists but has missing methods
    if (typeof globalThis.localStorage !== 'undefined') {
      const storage = globalThis.localStorage as any;

      if (typeof storage.getItem !== 'function') {
        const noopStorage = {
          getItem: (_key: string) => null,
          setItem: (_key: string, _value: string) => {},
          removeItem: (_key: string) => {},
          clear: () => {},
          key: (_index: number) => null,
          length: 0,
        };

        try {
          Object.defineProperty(globalThis, 'localStorage', {
            value: noopStorage,
            writable: true,
            configurable: true,
          });
        } catch {
          try {
            (globalThis as any).localStorage = noopStorage;
          } catch {
            // Unable to fix localStorage
          }
        }
      }
    }
  }
}
