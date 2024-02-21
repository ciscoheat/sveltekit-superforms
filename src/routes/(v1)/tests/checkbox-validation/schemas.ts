import { z } from 'zod';

export const schema = z.object({
	isAccredited: z.literal(true)
});
