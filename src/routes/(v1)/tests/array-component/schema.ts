import { z } from 'zod/v3';

export const schema = z.object({
	sub: z.object({
		tags: z.string().min(2).array().min(2)
	})
});
