import { z } from 'zod';

export const schema = z.object({
	id: z.number(),
	values: z.number().array()
});
