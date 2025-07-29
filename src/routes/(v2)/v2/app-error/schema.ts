import { z } from 'zod/v3';

export const userSchema = z.object({
	name: z.string(),
	exception: z.enum(['error', 'exception', 'json', 'plain'])
});
