import { schema } from './schema.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types.js';

const defaultData = {
	tags: [
		{ id: 1, name: 'A' },
		{ id: 2, name: 'Bb' },
		{ id: 3, name: 'Cc' },
		{ id: 4, name: 'Dd' }
	]
};

export const load = async () => {
	const form = await superValidate(defaultData, zod(schema), {
		errors: false,
		id: 'zod'
	});
	const form2 = await superValidate(defaultData, zod(schema), {
		errors: false,
		id: 'superforms'
	});

	return { form, form2 };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(schema));
		form.id = formData.get('id')?.toString() ?? form.id;

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });
		form.message = 'It works';

		return { form };
	}
} satisfies Actions;
