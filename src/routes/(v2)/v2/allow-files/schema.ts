import { z } from 'zod';

export const schema = z.object({
	avatar: z.custom<File>().refine((f) => {
		console.log('Checking file:');
		console.dir(f, { depth: 10 }); //debug
		return f && f.size < 10000;
	}, 'Max 10Kb upload size.')
});
