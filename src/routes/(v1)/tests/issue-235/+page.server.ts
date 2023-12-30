import { superValidate, message } from '$lib/server/index.js';
import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types.js';
import { exampleSchema } from './schema.js';

///// Load function /////

export const load: PageServerLoad = async () => {
	const form = await superValidate(exampleSchema);
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, exampleSchema);

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
