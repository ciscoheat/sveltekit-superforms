import { z } from 'zod';

export const schema = z.object({
	emptyUndef: z.number().optional(),
	number2: z.number().nullable(),
	emptyZero: z.number().optional(),
	date: z
		.date()
		.min(new Date('2021-01-01'))
		.max(new Date('2023-07-01'), 'Max date: 2023-07-01')
		.optional()
});
