import { z } from 'zod';

export const schema = z.object({
	active: z.boolean().optional(),
	interval: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(15)])
});
