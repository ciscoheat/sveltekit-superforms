import { z } from 'zod';

const fishes = ['trout', 'tuna', 'shark'] as const;

export const schema = z.object({
	fish: z.enum(fishes),
	moreFish: z.enum(fishes)
});
