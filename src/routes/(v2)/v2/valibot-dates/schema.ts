import { date, minLength, object, pipe, string } from 'valibot';

export const schema = object({
	date: date(),
	missing: pipe(string(), minLength(1))
});
