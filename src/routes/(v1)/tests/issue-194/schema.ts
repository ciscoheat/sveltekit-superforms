import { z } from 'zod';

export const schema = z.object({
	things: z.set(z.number()).default(new Set([2, 3]))
});
