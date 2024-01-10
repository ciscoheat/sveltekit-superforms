import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { z } from 'zod';

const schema = z.object({
	id: z.number().int().positive().default(NaN)
});

///// Load //////////////////////////////////////////////////////////

export const load = (async ({ url }) => {
	const form = await superValidate(url, zod(schema));
	console.log('load', form);
	return { form };
}) satisfies PageServerLoad;

///// Form actions //////////////////////////////////////////////////

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(schema));
		console.log('post', form.data.id);
		return form.valid ? { form } : fail(400, { form });
	}
} satisfies Actions;
