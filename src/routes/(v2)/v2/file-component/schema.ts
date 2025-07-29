import { z } from 'zod/v3';

export const schema = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	track: z.instanceof(File, { message: 'Please upload a file.' })
});
