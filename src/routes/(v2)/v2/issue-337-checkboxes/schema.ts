import { z } from 'zod';

export const schema = z.object({
	accept: z.boolean(),
	extra: z.number().positive().optional().default(0)
});
