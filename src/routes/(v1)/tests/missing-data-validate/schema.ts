import { z } from 'zod';

export const schema = z.object({
	age: z.number().min(30),
	name: z.string().min(1)
});
