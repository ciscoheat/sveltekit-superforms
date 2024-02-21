import { z } from 'zod';

export const basicSchema = z
	.object({
		name: z.string().min(2),
		username: z.string().min(2)
	})
	.transform((data) => data);
