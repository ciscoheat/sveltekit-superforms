import { superValidate, message } from '$lib/index.js';
import { valibot } from '$lib/adapters/valibot.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(valibot(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, valibot(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
