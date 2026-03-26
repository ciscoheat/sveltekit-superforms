import { object, string, email, minLength, pipe } from 'valibot';

export const schema = object({
	name: pipe(string(), minLength(2)),
	email: pipe(string(), email())
});
