import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().default('Hello world!'),
	email: z.string().email()
});
