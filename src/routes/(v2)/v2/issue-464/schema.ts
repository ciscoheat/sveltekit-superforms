import { z } from 'zod';

export const schema = z.object({
	testArray: z.number().array(),
	testStr: z.string().array().optional()
});
