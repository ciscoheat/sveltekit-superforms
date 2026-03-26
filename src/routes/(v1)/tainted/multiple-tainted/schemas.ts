import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string(),
	city: z.string(),
	age: z.number().min(1)
});
