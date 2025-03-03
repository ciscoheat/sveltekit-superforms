import { standard } from '$lib/adapters/standard.js';
import { message, superValidate } from '$lib/index.js';
import { fail } from '@sveltejs/kit';
import { valibotSchema, zodSchema } from './schema.js';

export const load = async () => {
	const valibotForm = await superValidate(standard(valibotSchema));
	const zodForm = await superValidate(standard(zodSchema));
	return { valibotForm, zodForm };
};

export const actions = {
	valibot: async ({ request }) => {
		const form = await superValidate(request, standard(valibotSchema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	},
	zod: async ({ request }) => {
		const form = await superValidate(request, standard(zodSchema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
