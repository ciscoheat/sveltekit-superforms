import type { Actions, PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
	const form = await superValidate(zod(schema));
	console.log('🚀 ~ file: +page.server.ts:8 ~ load ~ form:', form);

	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log('POST', form);

		if (!form.valid) return fail(400, { form });
	}
} satisfies Actions;
