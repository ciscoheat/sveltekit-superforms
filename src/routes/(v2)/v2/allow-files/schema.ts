import { z } from 'zod';

export const schema = z.object({
	avatar: z.custom<File>().refine((f) => {
		return f && f.size < 10000;
	}, 'Max 10Kb upload size.')
});
