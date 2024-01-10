import { superValidate, message } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';

import { schema } from './schema.js';

///// Load function /////

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions /////

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
