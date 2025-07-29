import { z } from 'zod/v3';

export const schema = z.object({
	details: z
		.object({
			name: z.string(),
			email: z.string().email()
		})
		.array()
});
