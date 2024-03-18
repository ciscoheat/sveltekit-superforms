import { zod } from '$lib/adapters/zod.js';
import { message, superValidate, withFiles } from '$lib/server/index.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		console.log('======================================================');

		const formData = await request.formData();
		console.dir(formData, { depth: 10 });

		const form = await superValidate(formData, zod(schema), { allowFiles: true });
		console.dir(form, { depth: 10 });

		if (!form.valid) return fail(400, withFiles({ form }));

		return message(form, 'Posted OK!');
	}
};
