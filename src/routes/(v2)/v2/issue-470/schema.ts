import { z } from 'zod/v3';

export const schema = z.object({
	value: z.number().nullable()
});
