import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { RecordId } from '../../../RecordId.js';

export const schema = z.object({
	id: z.instanceof(RecordId).default(new RecordId(123, 'test')),
	name: z.string().min(2),
	luckyNumber: z
		.instanceof(Decimal)
		.refine((d) => d.greaterThanOrEqualTo(1), 'Lucky number must be >= 1')
		.default(new Decimal(0))
});

export type Schema = z.infer<typeof schema>;
