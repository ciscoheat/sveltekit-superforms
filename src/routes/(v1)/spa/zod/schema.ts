import { z } from 'zod';

export const schema = z
	.object({
		tags: z
			.object({
				id: z.number().int().min(3),
				name: z.string().min(2)
			})
			.array(),
		redirect: z.boolean(),
		random: z.string()
	})
	.refine((data) => data);
