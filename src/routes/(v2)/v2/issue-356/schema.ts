import { z } from 'zod';

export const schema = z.object({
	id: z.string(),
	title: z.string({ required_error: 'A title is required' }).min(2).max(100),
	url: z.string({ required_error: 'A URL is required' }).url().max(100),
	description: z.string().max(500).optional(),
	image: z.string().url().optional()
	// category: z.object({
	// 	id: z.string().cuid(),
	// 	name: z.string(),
	// 	description: z.string().optional(),
	// 	userId: z.string().min(2).max(50),
	// 	createdAt: z.date(),
	// 	updatedAt: z.date()
	// }),
	// tags: z.array(
	// 	z.object({
	// 		id: z.string().cuid(),
	// 		name: z.string(),
	// 		userId: z.string().min(2).max(50),
	// 		createdAt: z.date(),
	// 		updatedAt: z.date()
	// 	})
	// )
});

export type FormSchema = typeof schema;
