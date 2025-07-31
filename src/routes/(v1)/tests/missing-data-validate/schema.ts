import { z } from 'zod/v3';

export const schema = z.object({
	age: z.number().min(30),
	name: z.string().min(1)
});
