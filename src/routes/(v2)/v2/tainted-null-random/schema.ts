import { z } from 'zod';

export const schema = z.object({
	foo: z
		.object({
			name: z.string(),
			link: z.string().url().optional(),
			other: z.string().optional()
		})
		.nullable()
});
