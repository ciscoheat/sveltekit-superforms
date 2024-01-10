import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { basicSchema, refined } from './schema.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

export const load = (async ({ url }) => {
	// Server API:
	const form = await superValidate(zod(url.searchParams.has('refined') ? refined : basicSchema));

	// Always return { form } in load and form actions.
	return { form };
}) satisfies PageServerLoad;

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await superValidate(
			request,
			zod(url.searchParams.has('refined') ? refined : basicSchema)
		);
		console.log('POST', form);

		// Convenient validation check:
		if (!form.valid) {
			// Again, always return { form } and things will just work.
			return fail(400, { form });
		}

		return message(form, 'Success');
	}
};
