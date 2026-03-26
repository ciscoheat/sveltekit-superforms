import { z } from 'zod/v3';

export const schema = z.object({
	user: z.object({
		name: z.string().min(1)
	})
});
