import { z } from 'zod/v3';

const itemSchema = z.object({
	name: z.string()
});

export const schema = z.object({
	instances: z.array(itemSchema)
});
