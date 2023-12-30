import { fail } from '@sveltejs/kit';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/index.js';

import type { Actions, PageServerLoad } from './$types.js';

import { formSchema } from './schemas.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate<typeof formSchema, { message: string }>(formSchema);

	return { form };
};

export const actions: Actions = {
	default: async (request) => {
		const form = await superValidate<typeof formSchema, { message: string }>(request, formSchema);
		console.log(form.valid);
		if (!form.valid) {
			return fail(400, { form });
		}

		return message(form, { message: 'Posted!' });
	}
};
