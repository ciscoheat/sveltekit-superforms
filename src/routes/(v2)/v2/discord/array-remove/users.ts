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

// Set a global variable to preserve DB when Vite reloads.
const g = globalThis as unknown as { users: UserDB };

// Let's worry about id collisions later
export const userId = () => String(Math.random()).slice(2);

// A simple user "database"
export const users: UserDB = (g.users = g.users || [
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
]);
