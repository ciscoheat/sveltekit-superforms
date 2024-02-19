import { z } from 'zod';

export const registerSchema = z.object({
	name: z.string().min(2),
	email: z.string().email()
});

export const profileSchema = z.object({
	name: z.string().min(2),
	age: z.number().gte(16).default(18)
});
