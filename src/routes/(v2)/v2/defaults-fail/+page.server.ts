import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/index.js';
import { fail } from '@sveltejs/kit';
import { schema, defaults } from './schema.js';

import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema, { defaults }));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema, { defaults }));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
} satisfies Actions;
