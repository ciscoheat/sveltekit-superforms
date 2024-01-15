import { zod } from '$lib/adapters/zod.js';
import { failAndRemoveFiles, message, superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.dir(formData, { depth: 10 });

		const form = await superValidate(formData, zod(schema), { allowFiles: true });
		console.dir(form, { depth: 10 });

		if (!form.valid) return failAndRemoveFiles(400, { form });

		return message(form, 'Posted OK!');
	}
};
