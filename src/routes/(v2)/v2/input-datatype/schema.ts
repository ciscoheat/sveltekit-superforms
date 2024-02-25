/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';

export const schema = z.object({
	test: z.string().nullish().default('OK'),
	len: z
		.string()
		.transform((s) => s.length)
		.pipe(z.number().min(2))
});

type In = z.input<typeof schema>;
type Out = z.infer<typeof schema>;
