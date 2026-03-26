import { z } from 'zod/v3';

export const schema = z.object({
	tags: z.array(z.string().min(1)).nonempty()
});
