import { superValidate } from '$lib/client/index.js';
import { z } from 'zod';

export const _schema = z.object({
	name: z.string().min(1)
});

export const load = async () => {
	const form = await superValidate(_schema);
	return { form };
};
