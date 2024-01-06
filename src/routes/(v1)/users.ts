import { z } from 'zod';

// See https://zod.dev/?id=primitives for schema syntax
export const userSchema = z.object({
	id: z.string().regex(/^\d+$/),
	name: z.string().min(2),
	email: z.string().email()
});

type UserDB = z.infer<typeof userSchema>[];

// Set a global variable to preserve DB when Vite reloads.
//const g = globalThis as unknown as { users: UserDB };

// Let's worry about id collisions later
export const userId = () => String(Math.random()).slice(2);

// A simple user "database"
export const users: UserDB = [
	{
		id: userId(),
		name: 'Important Customer',
		email: 'important@example.com'
	},
	{
		id: userId(),
		name: 'Super Customer',
		email: 'super@example.com'
	}
];
