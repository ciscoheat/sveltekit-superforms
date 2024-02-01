import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	agree: z.literal(true).default(false as true)
});
