import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

export const load = async () => {
	const adapter = zod(schema);
	//console.dir(adapter.jsonSchema, { depth: 10 }); //debug
	const form = await superValidate(adapter);
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formdata = await request.formData();
		const form = await superValidate(formdata, zod(schema));

		if (!form.valid) return fail(400, { form });

		if (form.data.type === 'empty') {
			console.log('Empty type submitted');
		} else {
			console.log('Extra type: ' + form.data.roleId);
		}

		return message(form, 'Form posted successfully!');
	}
};
