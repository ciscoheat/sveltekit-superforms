import { fail } from '@sveltejs/kit';
import type { Actions } from './$types.js';
import { basicSchema } from './schema.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

export const load = async () => {
	const form = await superValidate(zod(basicSchema));

	// Always return { form } in load and form actions.
	return { form };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(basicSchema));
		console.log('POST', form);

		// Convenient validation check:
		if (!form.valid) {
			// Again, always return { form } and things will just work.
			return fail(400, { form });
		}

		return message(form, 'Success');
	}
};
