import { z } from 'zod/v3';

export const schema = z.object({
	testArray: z.number().array(),
	testStr: z.string().array().optional()
});
