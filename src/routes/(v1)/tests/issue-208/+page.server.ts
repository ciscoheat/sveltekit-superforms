import type { Actions, PageServerLoad } from './$types.js';
import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { UserType, NumberType } from './UserType.js';

const schema = z.object({
	type: z.nativeEnum(UserType).default(UserType.WORKER),
	number: z.nativeEnum(NumberType).default(NumberType.WORKER)
});

///// Load //////////////////////////////////////////////////////////

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions //////////////////////////////////////////////////

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		console.log('🚀 ~ file: +page.server.ts:25 ~ default: ~ formData:', formData);
		const form = await superValidate(formData, zod(schema));

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, form.data.type + ' posted ' + form.data.number);
	}
};
