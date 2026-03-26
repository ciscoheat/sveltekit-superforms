import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().default('Hello world!'),
	testArray: z.object({ foo: z.string() }).array(),
	nested: z.object({
		arr: z.object({ foo: z.string() }).array()
	})
});
