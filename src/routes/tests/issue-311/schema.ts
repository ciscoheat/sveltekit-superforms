import { z } from 'zod';

export const schema = z.object({
	nested: z.any().nullable().default(null),
});
