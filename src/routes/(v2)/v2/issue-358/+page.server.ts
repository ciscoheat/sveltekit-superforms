import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

const db = { name: 'Default Defaulto', email: 'example@example.com' };

export const load = async () => {
	const form = await superValidate(db, zod(schema));

	console.log('Load ran ' + JSON.stringify(db));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		if (!form.valid) return fail(400, { form });

		// Forgot to update email
		db.name = form.data.name;

		return message(form, 'Form posted successfully!');
	}
};
