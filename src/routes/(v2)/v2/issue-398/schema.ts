import { z } from 'zod';

export const schema = z.object({
	file: z.instanceof(File).refine((f) => f.size < 100_000, 'Max 100 kB upload size.')
});
