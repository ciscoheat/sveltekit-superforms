import { z } from 'zod';
import { superValidate } from '$lib/client/index.js';
import { zod } from '$lib/adapters/zod.js';

const schema = z.object({
	title: z.string().min(3)
});

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};
