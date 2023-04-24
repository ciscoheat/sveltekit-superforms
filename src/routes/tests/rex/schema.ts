import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(4).default('Hello world!'),
	email: z.string().email()
})
