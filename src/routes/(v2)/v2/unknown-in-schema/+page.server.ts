import { zod } from '$lib/adapters/zod.js';
import { message, superValidate } from '$lib/server/index.js';
import { anySchema, schema, userSchema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(zod(schema));
	const anyForm = await superValidate(zod(anySchema));
	const userForm = await superValidate(
		{ name: 'some name', options: [{ color: 'option-1-color', value: 'option-1' }] },
		zod(userSchema)
	);
	return { form, anyForm, userForm };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
};
