import { z } from 'zod/v3';

export const schema = z.object({
	username: z
		.string()
		.min(3, 'Must be at least three characters.')
		.regex(/^[a-z]+$/, 'Must use only a-z characters.')
});
