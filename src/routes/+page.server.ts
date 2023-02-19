import { superValidate } from '$lib/server';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

const defaultSchema = z.object({
	name: z.string().min(2).default('Shigeru'),
	email: z.string().email(),
	delay: z.number().int().min(0).default(0)
});

export const load = (async (event) => {
	const form = await superValidate(event, defaultSchema);

	console.log('🚀 ~ LOAD', form);
	return { form };
}) satisfies PageServerLoad;

export const actions = {
	default: async (event) => {
		const form = await superValidate(event, defaultSchema);
		console.log('🚀 ~ POST', form);

		if (!form.success) return fail(400, { form });
		else form.message = 'Form posted!';

		await new Promise((resolve) => setTimeout(resolve, form.data.delay));

		return { form };
	}
} satisfies Actions;
