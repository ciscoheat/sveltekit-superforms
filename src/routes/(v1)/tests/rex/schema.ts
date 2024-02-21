import { z } from 'zod';

export const basicSchema = z.object({
	name: z.string().min(4).default('Hello world!'),
	email: z.string().email(),
	items: z.optional(z.array(z.object({ title: z.string(), name: z.string().min(3) }))),
	tags: z
		.object({
			min: z.number().int().min(5),
			max: z.number().int().min(5)
		})
		.array()
		.max(3)
		.default([{ min: 5, max: 10 }])
});

export const refined = z
	.object({
		name: z.string().min(4).default('Hello world!'),
		email: z.string().email(),
		items: z.optional(z.array(z.object({ title: z.string(), name: z.string().min(3) }))),
		tags: z
			.object({
				min: z.number().int().min(5),
				max: z.number().int().min(5)
			})
			.refine(
				(data) => {
					if (data.min && data.max) {
						return data.min <= data.max;
					}
					return true;
				},
				{
					path: ['max'],
					message: 'Max must be greater or equal to min'
				}
			)
			.array()
			.max(3)
			.default([{ min: 5, max: 10 }])
	})
	.refine(({ name }) => name !== 'nope', {
		message: 'Nope',
		path: ['name']
	})
	.refine(({ name }) => name !== 'nope', {
		message: 'Nope',
		path: ['name']
	})
	.superRefine((data, ctx) => {
		if (data.email.includes('spam')) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['email'],
				message: 'Suspicious email'
			});
		}
	})
	.transform((data) => data);
