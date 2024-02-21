import { z } from 'zod';

export const exampleSchema = z.object({
	radioGroup: z.boolean().default(false),
	checkbox: z.boolean()
});
