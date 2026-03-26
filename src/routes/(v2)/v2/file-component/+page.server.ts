import { superValidate, message, withFiles } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema), { allowFiles: true });
		console.log(form);

		if (!form.valid) return fail(400, withFiles({ form }));

		return message(form, 'Form posted successfully!');
	}
};
