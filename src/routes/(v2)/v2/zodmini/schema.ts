import { z } from 'zod/v4-mini';

export const schema = z.object({
	name: z._default(z.string(), 'Hello world!'),
	email: z.email('Invalid email')
});
