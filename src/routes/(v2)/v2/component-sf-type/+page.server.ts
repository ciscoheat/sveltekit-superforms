import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { three } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(three));
	return { form };
};
