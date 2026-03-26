import { message, superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));

	// Always return { form } in load functions
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		console.log(form);

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
		}

		// TODO: Do something with the validated form.data

		return message(form, 'Form posted successfully!');
	}
};
