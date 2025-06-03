// @ts-expect-error No type information exists
import baseMemoize from 'memoize-weak';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const wrap = <T extends Array<unknown>, U>(fn: (...args: T) => U) => {
	return (...args: T): U => fn(...args);
};

const memoize = baseMemoize as typeof wrap;

export { memoize };
