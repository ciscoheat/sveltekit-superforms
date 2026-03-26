import { z } from 'zod/v3';

export const schema = z.object({
	name: z
		.string()
		.min(2)
		.regex(/^[A-Z]/, 'should start with a capital letter'),
	email: z.string().email()
});
