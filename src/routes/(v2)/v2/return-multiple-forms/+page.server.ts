import type { Actions, PageServerLoad } from './$types.js';

import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema, other } from './schema.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	const otherForm = await superValidate(zod(other));

	return { form, otherForm };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		const prefill = {
			provider: form.data.email.split('@').pop()
		};
		const otherForm = await superValidate(prefill, zod(other));

		// return message(form, 'Form posted successfully!');
		return { form, otherForm };
	}
};
