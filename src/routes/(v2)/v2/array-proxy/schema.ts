import { z } from 'zod';

export const schema = z.object({
	tags: z.array(z.string().min(1)).nonempty()
});
