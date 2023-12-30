import type { Actions, PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import { schema } from './schemas.js';
import { fail } from '@sveltejs/kit';

export const load = (async (event) => {
	const form = await superValidate(event, schema);
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const form = await superValidate(formData, schema);
		console.log('POST', form);

		return form.valid ? { form } : fail(400, { form });
	}
} satisfies Actions;
