import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

///// Load //////////////////////////////////////////////////////////

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions //////////////////////////////////////////////////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
