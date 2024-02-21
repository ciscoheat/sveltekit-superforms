import { z } from 'zod';

export const schema = z.object({
	email: z.string().email().nullable(),
	name: z.string().nullable(),
	group: z
		.object({
			id: z.number(),
			name: z.string(),
			start_date: z.date(),
			end_date: z.date(),
			course_id: z.number()
		})
		.array()
});
