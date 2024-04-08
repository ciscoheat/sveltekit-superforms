import { valibot } from '$lib/adapters/valibot.js';
import { fail, superValidate } from '$lib/index.js';
import { classifySchema } from './schema.js';

export const actions = {
	default: async ({ request }) => {
		await new Promise((res) => setTimeout(res, 500));

		const form = await superValidate(request, valibot(classifySchema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return { form, posted: form.data.id };
	}
};
