import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().min(2),
	days: z.number().min(0).max(6).array().min(1)
});
