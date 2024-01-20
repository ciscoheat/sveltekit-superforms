import { superValidate, setError } from '$lib/server/index.js';
import { schema } from './schema.js';

import type { Actions, PageServerLoad } from './$types.js';
import { zod } from '$lib/adapters/zod.js';

///// Load function /////

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		console.log('POST', form);

		return setError(form, 'name', 'some error');
	}
};
