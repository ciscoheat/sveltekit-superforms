import { zod } from '$lib/adapters/zod.js';
import { message, superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const adapter = zod(schema);
	adapter.defaults = { fish: '' as 'trout', moreFish: '' as 'trout' };

	const form = await superValidate(adapter);
	const fish = adapter.jsonSchema?.properties?.['fish'];
	return { form, fish: typeof fish === 'object' && fish.enum ? fish.enum : [] };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Posted OK!');
	}
};
