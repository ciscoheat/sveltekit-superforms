import { fail } from '@sveltejs/kit';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import type { Actions, PageServerLoad } from './$types.js';

import { formSchema } from './schemas.js';
import { z } from 'zod';

export const load: PageServerLoad = async () => {
	const form = await superValidate<z.infer<typeof formSchema>, { message: string }>(
		zod(formSchema)
	);

	return { form };
};

export const actions: Actions = {
	default: async (request) => {
		const form = await superValidate<z.infer<typeof formSchema>, { message: string }>(
			request,
			zod(formSchema)
		);
		console.log(form.valid);
		if (!form.valid) {
			return fail(400, { form });
		}

		return message(form, { message: 'Posted!' });
	}
};
