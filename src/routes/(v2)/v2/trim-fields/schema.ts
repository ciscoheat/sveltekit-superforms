import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().min(2).trim(),
	direction: z
		.enum(['north', 'south', 'east', 'west'])
		.default('south')
		.transform((dir) => (dir == 'west' ? 'east' : dir))
});
