import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(2),
	address: z.string().min(2),
	city: z.string().min(2),
	agree: z.boolean(),
	roles: z.string().min(1).array().optional(),
	luckyNumber: z.number(),
	tags: z
		.object({
			name: z.string().min(2)
		})
		.array()
		.min(1)
		.default([{ name: 'tag1' }, { name: '2' }])
});

export type Schema = typeof schema;
