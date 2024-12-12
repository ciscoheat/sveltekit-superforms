import { arktype } from '$lib/adapters/arktype.js';
import { message, superValidate } from '$lib/index.js';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { schema } from './schema.js';

const defaults = {
	name: '',
	email: ''
};

export const load = (async () => {
	return {
		form: superValidate(arktype(schema, { defaults }))
	};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, arktype(schema, { defaults }));
		if (!form.valid) {
			return fail(400, { form });
		}

		return message(form, 'Form posted successfully!');
	}
};
