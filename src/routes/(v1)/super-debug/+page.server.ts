import { z } from 'zod';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

const schema = z.object({
	full_name: z.string().min(1, 'Full Name is required.'),
	email: z.string().min(1, 'Email is required.').email('Email is invalid.'),
	phone_number: z.string().min(1, 'Phone number is required.')
});

const bigSchema = z.object({
	full_name: z.string().min(1, 'Full Name is required.'),
	email: z.string().min(1, 'Email is required.').email('Email is invalid.'),
	age: z.number().min(1, 'Age is required.').max(100, 'Age is invalid.'),
	optional: z.string().optional(),
	nullable: z.string().nullable(),
	today: z
		.date()
		.min(new Date(2021, 0, 1), 'Date is invalid.')
		.default(() => new Date())
		.optional()
});

export const load = (async ({ request }) => {
	const form = await superValidate(request, zod(schema));
	const bigForm = await superValidate(request, zod(bigSchema));

	return {
		form,
		bigForm
	};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, zod(schema));
		if (!form.valid) return fail(400, { form });

		return { form };
	}
} satisfies Actions;
