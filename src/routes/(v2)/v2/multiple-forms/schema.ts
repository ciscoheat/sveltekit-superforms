import { z } from 'zod';

export const schema = z.object({
	id: z.number(),
	label: z.string()
});
