import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { postSchema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
	const form = await superValidate(zod(postSchema));
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(postSchema));

		console.dir(form, { depth: 6 });

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
} satisfies Actions;
