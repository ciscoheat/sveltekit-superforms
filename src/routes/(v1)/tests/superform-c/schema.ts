import { z } from 'zod';

export const schema = z
	.object({
		name1: z.string().default('jack'),
		name2: z.string().default('jack')
	})
	.refine(
		({ name1, name2 }) => {
			return name1.toLowerCase() === name2.toLowerCase();
		},
		{
			message: 'Name 2 Should Match Name 1',
			path: ['name2']
		}
	);
