import { z } from 'zod/v3';

export const schema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('empty')
	}),
	z.object({
		type: z.literal('extra'),
		roleId: z.string()
	})
]);
