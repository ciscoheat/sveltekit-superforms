import { fail, message, superValidate } from '$lib/index.js';
import type { PageServerLoad } from './$types.js';
import { zod } from '$lib/adapters/zod.js';
import { schema } from './schema.js';
import type { Actions } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions: Actions = {
	async default({ request }) {
		const form = await superValidate(request, zod(schema), { allowFiles: true });
		console.log('🚀 ~ default ~ form:', form);

		if (!form.valid) {
			return fail(400, { form });
		}
		return message(form, 'Posted OK!');
	}
};
