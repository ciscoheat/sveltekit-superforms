import { z } from 'zod/v3';

export const schemaStep1 = z.object({
	name: z.string().min(1)
});

export const schemaStep2 = schemaStep1.extend({
	email: z.string().email()
});
