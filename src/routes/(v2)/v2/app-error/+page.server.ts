import { superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { userSchema } from './schema.js';
import { error, fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate({ name: 'some name' }, zod(userSchema));

	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(userSchema));
		console.dir(form, { depth: 10 }); //debug

		if (!form.valid) {
			return fail(400, { form });
		}

		if (form.data.exception) {
			throw new Error('test-error');
		} else {
			// @ts-expect-error Does not follow the App.Error shape
			error(502, { code: 'expected', title: 'Error title', message: 'Error' });
		}
	}
};
