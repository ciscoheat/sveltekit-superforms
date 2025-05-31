import { z } from 'zod/v4-mini';

export const schema = z.object({
	name: z.string().check(z.minLength(2, 'Name is too short')),
	email: z.email('Invalid email')
});
