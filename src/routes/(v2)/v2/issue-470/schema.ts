import { z } from 'zod';

export const schema = z.object({
	value: z.number().nullable()
});
