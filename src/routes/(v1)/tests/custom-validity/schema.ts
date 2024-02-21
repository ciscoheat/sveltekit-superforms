import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	number: z.number().min(10),
	info: z.string().min(1),
	menu: z.enum(['first', 'second', 'third']).default('' as 'first'),
	radio: z.number().min(1),
	text: z.string().min(1),
	accept: z.literal(true).default(false as true)
});
