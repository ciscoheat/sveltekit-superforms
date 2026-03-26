import type { Actions, PageServerLoad } from './$types.js';
import { schema } from './schema.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

const defaultData = {
	tags: [
		{ id: 1, name: 'A' },
		{ id: 2, name: 'Bb' },
		{ id: 3, name: 'Cc' },
		{ id: 4, name: 'Dd' }
	],
	redirect: false
};

export const load = (async () => {
	const form = await superValidate(defaultData, zod(schema), {
		errors: false
	});
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(schema));

		if (!form.valid) return fail(400, { form });
		form.message = 'It works';

		if (form.data.redirect) {
			throw redirect({ type: 'success', message: 'It works (redirected)' }, event);
		}

		// Send invalid data but no errors, to see if the
		// server errors trumps the client-side validation.
		form.data = defaultData;
		return { form };
	}
} satisfies Actions;
