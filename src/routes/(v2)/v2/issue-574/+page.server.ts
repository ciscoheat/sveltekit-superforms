import type { Actions, PageServerLoad } from './$types.js';

import { superValidate, message } from '$lib/index.js';
import { schemasafe } from '$lib/adapters/schemasafe.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load: PageServerLoad = async () => {
	const adapter = schemasafe(schema);
	const defaultValue = {
		arr: [
			{
				arr: [
					{
						tryInvalidValue: ''
					}
				]
			}
		]
	};
	return {
		form: await superValidate(defaultValue, adapter)
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const adapter = schemasafe(schema);
		const form = await superValidate(request, adapter);
		console.log(form, form.data.arr[0].arr[0].tryInvalidValue);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
