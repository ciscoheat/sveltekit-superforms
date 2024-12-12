import { z } from 'zod';

export const schema = z.object({
	track: z.instanceof(File, { message: 'Please upload a file.' })
});
