import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().min(1).trim(),
	email: z
		.string()
		.email()
		.transform((email) => {
			console.log('Transforming email:', email);
			return 'always-same@email.com';
		})
});
