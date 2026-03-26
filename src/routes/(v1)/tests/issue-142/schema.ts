import { z } from 'zod/v3';

export const schema = z
	.object({
		name: z.string().min(1).default('form'),
		password: z.string().min(8).default('123123123'),
		confirmedPassword: z.string().default('123123123')
	})
	// comment out superRefine and form error works again
	.superRefine(({ confirmedPassword, password }, ctx) => {
		if (confirmedPassword !== password) {
			ctx.addIssue({
				code: 'custom',
				message: 'Passwords must match',
				path: ['confirmedPassword']
			});
		}
	});
