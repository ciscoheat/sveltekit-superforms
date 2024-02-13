import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	console.log(form.data);

	// Always return { form } in load functions
	return { form };
};

export const actions: Actions = {
	default: async ({ request }) => {
		// Use superValidate in form actions too, but with the request
		const formData = await request.formData();
		console.log('🚀 ~ default: ~ formData:', formData);
		const form = await superValidate(formData, zod(schema));

		console.dir(form, { depth: 10 });

		// Convenient validation check:
		if (!form.valid) {
			// Always return { form } and things will just work.
			return fail(400, { form });
		}

		// TODO: Do something with the validated form.data

		// Yep, return { form } here too
		return { form };
	}
};
