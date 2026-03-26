import type { Actions, PageServerLoad } from './$types.js';

import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

const now = new Date();
const pastDate = new Date();
pastDate.setDate(now.getDate() - 7); // Subtract 7 days

export const load: PageServerLoad = async () => {
	const data = {
		updates: [
			{
				updates: {
					dueDate: pastDate
				}
			}
		]
	};
	const form = await superValidate(data, zod(schema), { errors: false });
	return { form };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema));
		console.dir(form, { depth: 5 });

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
