import { parse, stringify } from 'devalue';
import type { Readable } from 'svelte/store';

export function clone<T>(data: T): T {
  if ('structuredClone' in globalThis) {
    return structuredClone(data);
  }
  return parse(stringify(data));
}

/**
 * Takes a store and returns a new one derived from the old one that is readable.
 *
 * @see https://github.com/sveltejs/svelte/blob/a2170f5bd5312ed6a63cc1a465826705dc295cd9/src/runtime/store/index.ts#L214-L223
 * @todo use svelte's `readonly` function once peer dependency >= 3.56.0
 *
 * @param store - store to make readonly
 */
export function readonly<T>(store: Readable<T>): Readable<T> {
  return {
    subscribe: store.subscribe.bind(store)
  };
}