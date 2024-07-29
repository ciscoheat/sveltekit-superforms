import { z } from 'zod';

export const schema = z.object({
	message: z.record(z.string()).optional()
});
