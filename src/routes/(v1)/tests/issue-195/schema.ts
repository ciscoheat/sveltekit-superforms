import { z } from 'zod';

export const schema = z.object({
	emaillist: z.boolean().optional().default(true)
});
