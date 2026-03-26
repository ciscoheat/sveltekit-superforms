import { z } from 'zod/v3';

export const exampleSchema = z.object({
	radioGroup: z.boolean().default(false),
	checkbox: z.boolean()
});
