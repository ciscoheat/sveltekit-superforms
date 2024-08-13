import { z } from 'zod';

export const schema = z.object({
	email: z.string().email()
});

export const other = z.object({
	provider: z.string()
});
