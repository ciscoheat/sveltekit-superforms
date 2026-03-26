import { superValidate } from '$lib/server/index.js';
import { fail, redirect } from '@sveltejs/kit';
import { generateSchema } from '../schema.js';

import type { Actions, PageServerLoad } from './$types.js';

///// Load function /////

export const load: PageServerLoad = async ({ params: { category } }) => {
	const form = await superValidate(generateSchema(category));
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request, params: { category } }) => {
		const form = await superValidate(request, generateSchema(category));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		throw redirect(307, '/v2/letters/qwerty');
	}
};
