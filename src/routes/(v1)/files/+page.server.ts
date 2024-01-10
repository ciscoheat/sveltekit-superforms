import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

const userSchema = z.object({
	file: z.string(),
	filename: z.string().min(1)
});

export const load = (async () => {
	const form = await superValidate(zod(userSchema));
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async (event) => {
		const data = await event.request.formData();
		console.log('Formdata', data);
		const form = await superValidate(data, zod(userSchema));
		console.log('Form', form);
		if (!form.valid) return fail(400, { form });

		const file = data.get('file');
		if (file instanceof File) {
			console.log(file.name, file);
			form.message = 'Uploaded: ' + file.name;
		} else {
			const output = message(form, 'No file uploaded.', { status: 400 });
			console.log(form);
			return output;
		}

		return { form };
	}
} satisfies Actions;
