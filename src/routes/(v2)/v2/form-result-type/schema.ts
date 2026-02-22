import { z } from 'zod/v3';

export const schema = z.object({
	dir: z
		.enum(['', 'north', 'south', 'east', 'west'])
		.refine((dir) => dir != '', 'No direction specified')
});
