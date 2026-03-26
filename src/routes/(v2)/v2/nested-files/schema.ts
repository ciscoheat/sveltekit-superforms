import { z } from 'zod/v3';

export const schema = z.object({
	image: z
		.custom<File>()
		.nullable()
		.optional()
		.refine((f) => f instanceof File && f.size < 10000, 'Max 10Kb upload size.'),
	images: z
		.custom<File>()
		.refine((f) => f instanceof File && f.size < 10000, 'Max 10Kb upload size.')
		.array()
});
