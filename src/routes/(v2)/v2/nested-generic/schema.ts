import { z } from 'zod';

export const schema = z.object({
	name: z.string().default('Hello world!'),
	email: z.string().email()
});
