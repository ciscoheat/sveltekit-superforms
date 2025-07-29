import { z } from 'zod/v3';

// Define at the top-level so it stays in memory and the adapter can be cached
export const schema = z.object({
	name: z.object({
		value: z.string().min(5)
	}),
	email: z.object({
		value: z.string().email()
	})
});
