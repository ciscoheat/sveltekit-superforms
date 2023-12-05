import { parse, stringify } from 'devalue';

// Thanks to: https://dev.to/tylim88/typescript-numeric-range-type-15a5#comment-22mld
export type NumericRange<
    START extends number,
    END extends number,
    ARR extends unknown[] = [],
    ACC extends number = never
> = ARR['length'] extends END
    ? ACC | START | END
    : NumericRange<START, END, [...ARR, 1], ARR[START] extends undefined ? ACC : ACC | ARR['length']>

export function clone<T>(data: T): T {
  if ('structuredClone' in globalThis) {
    return structuredClone(data);
  }
  return parse(stringify(data));
}
