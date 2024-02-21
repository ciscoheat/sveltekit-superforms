import { z } from 'zod';

export const RegisterSchema = z
	.object({
		username: z.string().optional(),
		email: z.string().min(5, 'error message').email(),
		password: z.string().min(8, 'error message'),
		passwordConfirm: z.string()
	})
	.refine((data) => data.password === data.passwordConfirm, {
		message: 'Passwords not equal',
		path: ['password_control']
	});
