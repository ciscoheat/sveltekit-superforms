import { superValidate } from '$lib/server/index.js';
import { redirect } from 'sveltekit-flash-message/server';
import { schema } from './schema';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(schema);
	return { form };
};

export const actions = {
	default: async (event) => {
		await new Promise((r) => setTimeout(r, 1000));

		const formData = await event.request.formData();
		console.log(formData);

		const form = await superValidate(formData, schema);
		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		throw redirect({ type: 'success', message: 'Redirect to same page' }, event);
	}
};
