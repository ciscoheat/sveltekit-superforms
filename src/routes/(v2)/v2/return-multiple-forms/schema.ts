import { z } from 'zod/v3';

export const schema = z.object({
	email: z.string().email()
});

export const other = z.object({
	provider: z.string()
});
