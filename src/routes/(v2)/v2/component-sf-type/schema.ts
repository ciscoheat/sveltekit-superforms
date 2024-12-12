import { z } from 'zod';

export const three = z.object({
	a: z.string(),
	b: z.string(),
	c: z.string()
});

export const two = z.object({
	a: z.string(),
	b: z.string()
});
