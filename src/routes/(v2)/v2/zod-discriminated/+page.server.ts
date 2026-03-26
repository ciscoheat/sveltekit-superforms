import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { UserProfileZodSchema } from './schema.js';

export const load = async () => {
	const form = await superValidate(
		{
			name: 'Programmer',
			email: 'cocplayout@gmail.com'
		},
		zod(UserProfileZodSchema)
	);

	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(UserProfileZodSchema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, 'Form posted successfully!');
	}
};
