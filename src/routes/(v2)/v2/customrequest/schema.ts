import { z } from 'zod/v3';

export const schema = z.object({
	track: z.instanceof(File, { message: 'Please upload a file.' })
});
