import { z } from 'zod';

export const schema = z.object({
	avatar: z
		.instanceof(File, { message: 'Please upload a file.' })
		.refine((f) => f.size < 10_000, 'Max 10Kb upload size.')
		.nullable()
});
