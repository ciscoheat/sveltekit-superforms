import { z } from 'zod';

// Define at the top-level so it stays in memory and the adapter can be cached
export const schema = z.object({
	name: z.object({
		value: z.string().min(5)
	}),
	email: z.object({
		value: z.string().email()
	})
});
