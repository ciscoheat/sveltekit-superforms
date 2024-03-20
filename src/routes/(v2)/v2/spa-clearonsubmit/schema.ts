import { object, string, email, minLength } from 'valibot';

export const schema = object({
	name: string([minLength(2)]),
	email: string([email()])
});
