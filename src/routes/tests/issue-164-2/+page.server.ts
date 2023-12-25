import { superValidate } from '$lib/server';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

const barSchema = z.object({
	name: z.string(),
	color: z.string(), // not used, just here to make the schemas different and thus diff IDs
});

const fooSchema = z.object({
	name: z.string(),
});

export const load = async () => {
	const fooForm = await superValidate(fooSchema);
	const barForm = await superValidate(barSchema);

	return {
		fooForm,
		barForm
	};
};

export const actions = {
	fooAction: async ({ request }) => {
		const form = await superValidate(request, fooSchema);
		console.log('POST', form);

		if (!form.valid) {
			return fail(400, { form });
		}

		if (form.data.name === 'error') {
			throw error(500, 'something went wrong');
		}

		return { form };
	},
	barAction: async ({request}) => {
		const form = await superValidate(request, barSchema);
		console.log('POST', form);

		if (!form.valid) {
			return fail(400, { form });
		}

		if (form.data.name === 'error') {
			throw error(500, 'something went wrong');
		}

		return { form };
	}
};
