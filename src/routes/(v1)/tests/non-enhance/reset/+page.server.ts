import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { schema } from './schemas.js';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
	const form = await superValidate(zod(schema));
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(schema));
		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted ok!');
	}
} satisfies Actions;
