import { zod } from '$lib/adapters/index.js';
import { failAndRemoveFiles, message, superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema), { allowFiles: true });
		console.log('POST', form);

		if (!form.valid) return failAndRemoveFiles(400, { form });

		return message(form, 'Posted OK!');
	}
};
