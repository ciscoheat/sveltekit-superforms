import { z } from 'zod/v3';

export const schema = z.object({
	time: z.date(),
	datetime: z.date()
});
