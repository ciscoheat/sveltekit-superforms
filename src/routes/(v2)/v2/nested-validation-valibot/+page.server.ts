import { schema } from './schema.js';
import { superValidate } from '$lib/server/index.js';

import { fail } from '@sveltejs/kit';
import type { Actions } from './$types.js';
import { valibot } from '$lib/adapters/valibot.js';

const defaults = {
	name: '',
	tags: [
		{ id: 1, name: 'A' },
		{ id: 2, name: 'Bb' },
		{ id: 3, name: 'Cc' },
		{ id: 4, name: 'Dd' }
	]
};

export const load = async () => {
	const form = await superValidate(defaults, valibot(schema, { defaults }), {
		errors: false,
		id: 'valibot'
	});
	const form2 = await superValidate(defaults, valibot(schema, { defaults }), {
		errors: false,
		id: 'superforms'
	});

	return { form, form2 };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, valibot(schema, { defaults }));
		form.id = formData.get('id')?.toString() ?? form.id;

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });
		form.message = 'It works';

		return { form };
	}
} satisfies Actions;
