import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(2),
	points: z.number().int().min(0).max(5),
	email: z.string().email()
});

export const step1 = schema.pick({
	name: true
});

export const step2 = schema.pick({
	points: true
});

export const step3 = schema.pick({
	email: true
});
