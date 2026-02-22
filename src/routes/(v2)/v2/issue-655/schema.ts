import { z } from 'zod';

export const schema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('empty')
	}),
	z.object({
		type: z.literal('extra'),
		name: z.string().min(1),
		age: z.int().min(1)
	})
]);
