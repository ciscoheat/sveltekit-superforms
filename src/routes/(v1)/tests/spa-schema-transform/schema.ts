import { z } from 'zod';

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
