import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(1, {
		message: 'Enter your name'
	}),
	email: z.string().email(),
	password: z.string().min(6, {
		message: 'Your password must be at least 6 characters long'
	}),
	confirmPassword: z.string().min(6, {
		message: 'Confirm your password'
	})
});
