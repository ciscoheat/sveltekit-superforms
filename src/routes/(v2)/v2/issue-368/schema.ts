import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(5),
	email: z.string().email().default('test@test.com')
});
