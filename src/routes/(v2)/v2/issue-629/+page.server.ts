import { fail, superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod4.js';
import { v4FormSchema } from './form-schema.js';

export async function load() {
	const v4Form = await superValidate(zod(v4FormSchema));

	return { v4Form };
}

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(v4FormSchema));
		if (!form.valid) return fail(400, { form });

		console.log('Form submitted successfully:', form.data);

		return { form };
	}
};
