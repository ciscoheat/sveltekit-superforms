import { z } from 'zod';

export const schema = z.object({
	image: z.instanceof(File, { message: 'Please upload a file.' }).nullable(),
	undefImage: z.instanceof(File, { message: 'Please upload a file.' }),
	images: z.instanceof(File, { message: 'Please upload files.' }).array()
});
