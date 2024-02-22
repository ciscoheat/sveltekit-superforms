import { superValidate } from '$lib/client/index.js';
import { zod } from '$lib/adapters/zod.js';

import { z } from 'zod';

export const _schema = z.object({
	name: z.string().min(1)
});

export const load = async () => {
	console.log('+page.ts load');
	const form = await superValidate(zod(_schema));
	return { form };
};
