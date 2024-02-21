import { fail } from '@sveltejs/kit';
import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { schema } from './schema.js';

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		console.log(form);

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
		}

		// TODO: Do something with the validated form.data

		// Yep, return { form } here too
		return { form };
	}
};
