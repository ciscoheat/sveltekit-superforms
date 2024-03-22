import { z } from 'zod';

export const schema = z.object({
	dir: z
		.enum(['', 'north', 'south', 'east', 'west'])
		.refine((dir) => dir != '', 'No direction specified')
});
