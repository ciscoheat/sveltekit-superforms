import { z } from 'zod/v3';

export const schema = z.object({
	priceRules: z
		.array(
			z.object({
				priceCategory: z.object({
					value: z.string().min(2)
				})
			})
		)
		.min(2)
});
