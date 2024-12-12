import { schemasafe } from '$lib/adapters/schemasafe.js';
import { message, superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const adapter = schemasafe(schema);
	const form = await superValidate(adapter);
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const adapter = schemasafe(schema, { descriptionAsErrors: true });
		const form = await superValidate(formData, adapter);
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
};
