import { z } from 'zod';

export const schema = z.object({
	time: z.date(),
	datetime: z.date()
});
