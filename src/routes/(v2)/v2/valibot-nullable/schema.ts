import { object, string, minLength, email, nullable, pipe } from 'valibot';

export const schema = object({
	name: nullable(pipe(string(), minLength(1))),
	email: pipe(string(), email())
});
