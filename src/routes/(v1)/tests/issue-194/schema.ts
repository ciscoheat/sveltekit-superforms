import { z } from 'zod/v3';

export const schema = z.object({
	things: z.set(z.number()).default(new Set([2, 3]))
});
