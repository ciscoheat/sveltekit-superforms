import { z } from 'zod';

export const schema = z
	.object({
		name: z.string().min(1, 'Name is too short'),
		tags: z
			.object({
				id: z.number().int().min(3),
				name: z.string().min(2)
			})
			.array()
	})
	.refine((data) => data);
