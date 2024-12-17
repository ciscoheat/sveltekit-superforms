import { zod } from '$lib/adapters/zod.js';
import { fail } from '$lib/index.js';
import { superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log(form);

		if (!form.valid) {
			return fail(400, { form });
		}

		return { form };
	}
};
