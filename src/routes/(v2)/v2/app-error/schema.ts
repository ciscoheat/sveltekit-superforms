import { z } from 'zod';

export const userSchema = z.object({
	name: z.string(),
	exception: z.enum(['error', 'exception', 'json', 'plain'])
});
