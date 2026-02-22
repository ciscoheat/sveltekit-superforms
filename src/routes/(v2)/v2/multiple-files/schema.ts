import { z } from 'zod/v3';

export const schema = z.object({
	images: z
		.custom<File>()
		.refine((f) => f instanceof File && f.size < 10000, 'Max 10Kb upload size.')
		.array()
});
