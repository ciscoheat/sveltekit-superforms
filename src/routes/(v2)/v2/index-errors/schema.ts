import { z } from 'zod';

const itemSchema = z.object({
	name: z.string()
});

export const schema = z.object({
	instances: z.array(itemSchema)
});
