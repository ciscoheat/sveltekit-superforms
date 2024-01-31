import { z } from 'zod';

export const createUserSchema = z.object({
	email: z.string(),
	pw: z.string()
});

export const updateUserSchema = createUserSchema.extend({
	id: z.string()
});

export const unionizedSchema = z.union([createUserSchema, updateUserSchema]);
