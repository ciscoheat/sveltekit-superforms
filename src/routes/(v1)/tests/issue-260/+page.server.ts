import { fail } from '@sveltejs/kit';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import type { Actions, PageServerLoad } from './$types.js';
import { schema, type Message } from './utils.js';
import { z } from 'zod';

///// Load function /////

export const load: PageServerLoad = async () => {
	const form = await superValidate<z.infer<typeof schema>, Message>(zod(schema));
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate<z.infer<typeof schema>, Message>(request, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, {
			type: 'success',
			text: 'Form posted successfully!'
		});
	}
};
