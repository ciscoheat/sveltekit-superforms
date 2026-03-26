import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(zod(schema));

	const { data } = form;

	return { form: data };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		return { form };
	}
};
