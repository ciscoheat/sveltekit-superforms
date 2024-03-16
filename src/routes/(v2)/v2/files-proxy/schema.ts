import { z } from 'zod';

export const schema = z.object({
	images: z
		.custom<File>()
		.refine((f) => f instanceof File && f.size < 10000, 'Max 10Kb upload size.')
		.array(),
	image: z
		.instanceof(File, { message: 'Please upload a file.' })
		.refine((f) => f.size < 10000, 'Max 10Kb upload size.')
});
