import justClone from 'just-clone';

// Thanks to: https://dev.to/tylim88/typescript-numeric-range-type-15a5#comment-22mld
export type NumericRange<
	START extends number,
	END extends number,
	ARR extends unknown[] = [],
	ACC extends number = never
> = ARR['length'] extends END
	? ACC | START | END
	: NumericRange<START, END, [...ARR, 1], ARR[START] extends undefined ? ACC : ACC | ARR['length']>;

export type ErrorStatus = NumericRange<400, 599>;

export function clone<T>(data: T): T {
	return data && typeof data === 'object' ? justClone(data) : data;
}

export type MaybePromise<T> = T | Promise<T>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<T> = T extends object ? { [K in keyof T]: T[K] } : T & {};
