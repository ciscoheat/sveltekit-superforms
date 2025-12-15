import { z } from 'zod';

export const schema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('empty')
	}),
	z.object({
		type: z.literal('extra'),
		extra: z.object({
			name: z.string().min(1)
		})
	})
]);
