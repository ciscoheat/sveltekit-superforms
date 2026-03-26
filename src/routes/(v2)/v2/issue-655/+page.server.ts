import type { Actions, PageServerLoad } from './$types.js';

import { superValidate, message } from '$lib/index.js';
import { zod as zod4 } from '$lib/adapters/zod4.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load: PageServerLoad = async () => {
	return { form: await superValidate(zod4(schema)) };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		console.log('RAW FORM DATA:');
		console.log(data);

		const adapter = zod4(schema);
		console.log('ADAPTER JSON SCHEMA:');
		console.dir(adapter.jsonSchema, { depth: null });

		const form = await superValidate(data, adapter);
		console.log('PROCESSED FORM:');
		console.dir(form, { depth: null });

		if (!form.valid) return fail(400, { form });

		if (form.data.type === 'empty') {
			console.log('Empty name submitted');
		} else {
			console.log('Extra name: ' + form.data.name);
		}

		return message(form, 'Form posted successfully!');
	}
};
