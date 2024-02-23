import { z } from 'zod';

export const schema = z.object({
	name: z.string(),
	age: z.number(),
	homePlanet: z.unknown()
});
