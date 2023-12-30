import { z } from 'zod';

export const schema = z.object({
	str: z.string().datetime(),

	plain: z.date(),
	//plainUtc: z.date().transform((val) => convertDateToUTC(val)),

	coerced: z.coerce.date(),
	//coercedUtc: z.coerce.date().transform((val) => convertDateToUTC(val)),

	proxy: z.date(),
	//proxyUtc: z.coerce.date().transform((val) => convertDateToUTC(val)),

	proxyCoerce: z.coerce.date()
	//proxyCoerceUtc: z.coerce.date().transform((val) => convertDateToUTC(val))
});

/*
function convertDateToUTC(date: Date) {
  //console.log('before transform:', date);
  const output = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  //console.log('after transform: ', output);
  return output;
}
*/

export function schemaToStr(data: Record<string, Date | string>) {
	return Object.fromEntries(
		Object.entries(data).map(([key, value]) => [
			key,
			value instanceof Date ? value.toISOString() : String(value)
		])
	);
}
