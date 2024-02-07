import { superValidate, message } from '$lib/server/index.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

import type { Actions, PageServerLoad } from './$types.js';
import { zod } from '$lib/adapters/zod.js';
import { userSchema, users } from './users.js';
import { z } from 'zod';

const db = users();
const union = z.union([schema, userSchema]);

export const load: PageServerLoad = async () => {
	const form = await superValidate(db[0], zod(union));
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
