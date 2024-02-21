import { z } from 'zod';

export const schema = z
	.object({
		name: z.string().min(1),
		secondName: z.string().min(1)
	})
	.refine(({ name, secondName }) => name === secondName, {
		message: 'Names must be the same',
		path: ['secondName']
	});
