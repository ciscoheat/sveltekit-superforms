import { superValidate, message } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

import type { Actions, PageServerLoad } from './$types.js';

///// Load function /////

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		form.data.email = 'posted@example.com';

		console.log('🚀 ~ file: +page.server.ts:27 ~ default: ~ form:', form);

		return message(form, 'Form posted successfully!');
	}
};
