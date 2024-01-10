import { setError, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';
import type { SuperValidated } from '$lib/index.js';

import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';
import { z } from 'zod';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions //////////////////////////////////////////////////

function stripPassword(form: SuperValidated<z.infer<typeof schema>>) {
	// comment out password clearing and form error works again
	form.data.password = '';
	form.data.confirmedPassword = '';
	return form;
}

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(schema));
		console.log('🚀 ~ file: +page.server.ts:24 ~ default: ~ form:', form);

		if (!form.valid) return fail(400, { form: stripPassword(form) });

		if (form.data.name === 'form') {
			return setError(stripPassword(form), 'This is not a sticky form error');
		}

		return { form: stripPassword(form) };
	}
};
