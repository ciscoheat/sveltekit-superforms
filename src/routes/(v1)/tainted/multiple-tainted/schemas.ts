import { z } from 'zod';

export const schema = z.object({
	name: z.string(),
	city: z.string(),
	age: z.number().min(1)
});
