import { parse, stringify } from 'devalue';

export function clone<T>(data: T): T {
  if ('structuredClone' in globalThis) {
    return structuredClone(data);
  }
  return parse(stringify(data));
}
