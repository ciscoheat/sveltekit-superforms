import { z } from 'zod';

export const schema = z.object({
	data: z.record(z.number()).default({ first: 1, second: 2 })
});
