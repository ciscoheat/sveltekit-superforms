import { z } from 'zod/v3';

export const schema = z.object({
	data: z.record(z.number()).default({ first: 1, second: 2 })
});
