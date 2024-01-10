import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';
import { schema } from './schemas.js';
import { fail } from '@sveltejs/kit';

export const load = (async () => {
	const form = await superValidate(zod(schema), {
		errors: true
	});
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const form = await superValidate(formData, zod(schema));
		console.dir(form, { depth: 5 });

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted!');
	}
} satisfies Actions;
