import { arktype } from '$lib/adapters/arktype.js';
import { message, superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

const defaults = { name: '', email: '' };

export const load = async () => {
	const form = await superValidate(arktype(schema, { defaults }));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, arktype(schema, { defaults }));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
};
