import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		console.log('==================================================================');
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log(form);

		form.message = 'Form posted!';

		if (!form.valid) return fail(400, { form });

		return { form };
	}
};
