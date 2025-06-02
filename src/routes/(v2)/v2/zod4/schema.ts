import { z } from 'zod/v4';

export const schema = z.object({
	name: z.string().min(2),
	email: z.email()
});
