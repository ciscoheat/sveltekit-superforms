import { z } from 'zod/v3';

export const schema = z.object({
	checkbox: z.boolean().optional()
});
