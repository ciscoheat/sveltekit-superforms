import { z } from 'zod';

export const schema = z.object({
	checkbox: z.boolean().optional()
});
