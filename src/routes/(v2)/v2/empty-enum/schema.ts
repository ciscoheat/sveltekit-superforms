import { z } from 'zod/v3';

const fishes = ['trout', 'tuna', 'shark'] as const;

export const schema = z.object({
	fish: z.enum(fishes),
	moreFish: z.enum(fishes)
});
