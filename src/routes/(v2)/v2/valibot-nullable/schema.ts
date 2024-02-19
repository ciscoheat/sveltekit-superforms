import { object, string, minLength, email, nullable } from 'valibot';

export const schema = object({
	name: nullable(string([minLength(1)])),
	email: string([email()])
});
