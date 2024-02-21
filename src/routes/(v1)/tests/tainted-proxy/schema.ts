import { z } from 'zod';

export const schema = z.object({
	user: z.object({
		name: z.string().min(1)
	})
});
