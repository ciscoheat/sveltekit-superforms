import { Decimal } from 'decimal.js';
import { z } from 'zod';

export const schema = z.object({
	name: z.string().min(2),
	luckyNumber: z
		.instanceof(Decimal)
		.refine((d) => d.greaterThanOrEqualTo(1), 'Lucky number must be >= 1')
		.default(new Decimal(0))
});

export type Schema = z.infer<typeof schema>;
