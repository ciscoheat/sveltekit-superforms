import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/index.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};
