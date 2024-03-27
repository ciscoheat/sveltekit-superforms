import { valibot } from '$lib/adapters/valibot.js';
import { fail, message, superValidate } from '$lib/index.js';
import * as v from 'valibot';

export const _classifySchema = v.object({
	id: v.number([v.minValue(1)]),
	name: v.string()
});

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, valibot(_classifySchema));
		console.log(form);

		if (!form.valid) return fail(400, { form });

		return message(form, { id: form.data.id });
	}
};
