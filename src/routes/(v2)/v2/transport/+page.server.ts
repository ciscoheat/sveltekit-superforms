import { zod } from '$lib/adapters/zod.js';
import { message, superValidate } from '$lib/server/index.js';
import { transport } from '../../../../hooks.js';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema), {
			transport
		});
		if (!form.valid) return fail(400, { form });

		form.data.luckyNumber = form.data.luckyNumber.mul(2);

		return message(form, 'Your lucky number times 2 is ' + form.data.luckyNumber);
	}
};
