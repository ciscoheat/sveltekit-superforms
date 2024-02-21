import { z } from 'zod';

export const schema = z
	.object({
		persons: z.array(z.object({ name: z.string().min(1) }))
	})
	.refine((data) => (data.persons?.length ?? 0) >= 2, {
		message: 'Need at least two persons'
	});
