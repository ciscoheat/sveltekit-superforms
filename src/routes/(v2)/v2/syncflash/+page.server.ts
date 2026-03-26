import { zod } from '$lib/adapters/zod.js';
import { message, superValidate } from '$lib/server/index.js';
import { redirect } from 'sveltekit-flash-message/server';
import { schema } from './schema.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		console.log(formData);

		const form = await superValidate(formData, zod(schema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		if (form.data.name.toLowerCase() == 'redirect')
			return redirect({ message: 'syncFlashMessage:redirect', type: 'success' }, event);

		return message(form, { message: 'syncFlashMessage:message', type: 'success' });
	}
};
