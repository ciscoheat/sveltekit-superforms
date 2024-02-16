import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		await new Promise((r) => setTimeout(r, 9000));
		const form = await superValidate(request, zod(schema));

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
};
