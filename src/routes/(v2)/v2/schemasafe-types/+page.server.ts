import { schemasafe } from '$lib/adapters/schemasafe.js';
import { message, superValidate } from '$lib/server/index.js';
import { schema, constSchema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(schemasafe(schema));
	const constForm = await superValidate(schemasafe(constSchema));

	return { form, constForm };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const adapter = schemasafe(schema);
		const adapter2 = schemasafe(constSchema);
		const form = await superValidate(formData, adapter);
		const form2 = await superValidate(formData, adapter2);

		if (!form.valid || !form2.valid) {
			return fail(400, { form });
		}

		return message(form, 'Form posted successfully!');
	}
};
