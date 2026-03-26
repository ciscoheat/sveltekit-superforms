import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	subject: z.string().min(1),
	message: z.string().min(1)
});
