import { date, minLength, object, string } from 'valibot';

export const schema = object({
	date: date(),
	missing: string([minLength(1)])
});
