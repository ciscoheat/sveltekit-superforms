import type { Actions, PageServerLoad } from './$types.js';

import { superValidate, message } from '$lib/index.js';
import { zod as zod4 } from '$lib/adapters/zod4.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load: PageServerLoad = async () => {
	return { form: await superValidate(zod4(schema)) };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) return fail(400, { form });

		if (form.data.type === 'empty') {
			console.log('Empty name submitted');
		} else {
			console.log('Extra name: ' + form.data.extra.name);
		}

		return message(form, 'Form posted successfully!');
	}
};
