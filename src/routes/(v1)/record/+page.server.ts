import type { Actions, PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import type { z } from 'zod';
import { schema } from './schemas.js';

export const load = (async () => {
	const form = await superValidate(schema);
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, schema);
		console.log('POST', form);

		return { form };
	}
} satisfies Actions;
