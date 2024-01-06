import { z } from 'zod';

// See https://zod.dev/?id=primitives for schema syntax
const emailSchema = z.object({
	type: z.string().optional(),
	email: z.string().email()
});

export const userSchema = z.object({
	id: z.string().regex(/^\d+$/),
	name: z.string().min(1),
	emails: z.array(emailSchema)
});

type UserDB = z.infer<typeof userSchema>[];

// Let's worry about id collisions later
export const userId = () => String(Math.random()).slice(2);

export const users = () =>
	[
		{
			id: userId(),
			name: 'Important Customer',
			emails: [
				{ email: 'important@example.com', type: 'private' },
				{ email: 'important2@example.com', type: 'private' }
			]
		},
		{
			id: userId(),
			name: 'Super Customer',
			emails: [
				{ email: 'super@example.com', type: 'private' },
				{ email: 'super2@example.com', type: 'private' }
			]
		}
	] as UserDB;
