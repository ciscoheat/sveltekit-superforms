import { superValidate, message, setError } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import { z } from 'zod';

import type { Actions, PageServerLoad } from './$types.js';

/*
type FormType = {
	name: any;
	email: any;
	days: any;
};
*/

const raw = {
	name: z.string().min(1),
	email: z.string().email(),
	days: z.number().min(0).max(6).array().nonempty()
};

type FormTypeOk = typeof raw;

/*
type FormType = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	name: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	email: any;
	days: z.ZodArray<z.ZodNumber, 'atleastone'>;
};
*/

const schema = z.object<FormTypeOk>({
	name: z.string().min(1),
	email: z.string().email(),
	days: z.number().min(0).max(6).array().nonempty()
});

///// Load function /////

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

///// Form actions /////

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));

		const data = form.data;

		if (!data.days?.length) {
			setError(form, 'days._errors', 'You have to select at least one day!');
		}

		console.log('POST', form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
