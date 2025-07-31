import { z } from 'zod/v3';

export const basicSchema = z
	.object({
		name: z.string().min(2),
		username: z.string().min(2)
	})
	.transform((data) => data);
