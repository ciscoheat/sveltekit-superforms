import { zod } from '$lib/adapters/zod.js';
import { removeFiles, message, superValidate } from '$lib/server/index.js';
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

		const form = await superValidate(formData, zod(schema), {
			allowFiles: true
		});
		console.log('POST', form);

		if (!form.valid) {
			form.data.avatar = null;
			return fail(400, removeFiles({ form }));
		}

		return message(form, 'Posted OK!');
	}
};
