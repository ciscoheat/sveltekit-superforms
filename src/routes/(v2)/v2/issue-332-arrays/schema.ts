import { z } from 'zod';

export const schema = z.object({
	name: z.string().default('Hello world!'),
	testArray: z.object({ foo: z.string() }).array(),
	nested: z.object({
		arr: z.object({ foo: z.string() }).array()
	})
});
