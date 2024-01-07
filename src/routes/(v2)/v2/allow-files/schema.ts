import { z } from 'zod';

export const schema = z.object({
	avatar: z
		.custom<File>()
		.refine((f) => {
			return f instanceof File && f.size < 10000;
		}, 'Max 10Kb upload size.')
		.nullable()
});
