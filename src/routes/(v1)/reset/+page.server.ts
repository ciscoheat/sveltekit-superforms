import type { Actions, PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { schema } from './schemas.js';

export const load = (async (event) => {
	const form = await superValidate(event, zod(schema));
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const form = await superValidate(data, zod(schema));
		console.log('POST', form);

		return { form };
	}
} satisfies Actions;
