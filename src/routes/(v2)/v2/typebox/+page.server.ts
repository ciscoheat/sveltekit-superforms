import { typebox } from '$lib/adapters/typebox.js';
import { message, superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(typebox(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, typebox(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
};
