import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { schemaStep2 as lastStep } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	// Create the form with the last step, to get all default values
	const form = await superValidate(zod(lastStep));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(lastStep));

		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
