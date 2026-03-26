import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return {
		form
	};
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		return {
			form
		};
	}
};
