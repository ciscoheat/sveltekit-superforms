import { z } from 'zod/v3';

const emailSchema = z.object({
	type: z.string().optional(),
	email: z.string().email()
});

export const schema = z.object({
	name: z.string().min(1),
	emails: z.array(emailSchema)
});
