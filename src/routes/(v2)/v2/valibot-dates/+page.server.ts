import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';
import { superValidate } from '$lib/index.js';
import { valibot } from '$lib/adapters/valibot.js';

export const load = async () => {
	const form = await superValidate(valibot(schema));
	return { form };
};

export const actions = {
	test: async (event) => {
		const formData = await event.request.formData();
		console.log('🚀 ~ test: ~ formData:', formData);
		const form = await superValidate(formData, valibot(schema));
		console.log(form);
		if (!form.valid) return fail(400, { form });
		return { form };
	}
};
