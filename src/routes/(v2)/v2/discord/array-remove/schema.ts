import { z } from 'zod';

const emailSchema = z.object({
	type: z.string().optional(),
	email: z.string().email()
});

export const schema = z.object({
	name: z.string().min(1),
	emails: z.array(emailSchema)
});
