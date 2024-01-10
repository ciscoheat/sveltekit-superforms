import { z } from 'zod';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

const simpleSchema = z.object({
	full_name: z.string().min(1, 'Full Name is required.'),
	email: z.string().min(1, 'Email is required.').email('Email is invalid.'),
	age: z.number().min(1, 'Age is required.').max(100, 'Age is invalid.')
});

const complexSchema = simpleSchema.extend({
	address: z.object({
		street: z.string().min(1, 'Street is required.'),
		city: z.string().min(1, 'City is required.'),
		state: z.string().min(1, 'State is required.'),
		zip: z.string().min(1, 'Zip is required.')
	}),
	phones: z.array(z.string().min(1, 'Number is required.')),
	children: z.array(
		z.object({
			name: z.string().min(1, 'Name is required.'),
			age: z.number().min(1, 'Age is required.').max(100, 'Age is invalid.')
		})
	),
	today: z
		.date()
		.min(new Date(2021, 0, 1), 'Date is invalid.')
		.default(() => new Date())
		.optional(),
	optional: z.string().optional(),
	nullable: z.string().nullable()
});

export const load = (async ({ request }) => {
	const [simpleForm, complexForm] = await Promise.all([
		superValidate(request, zod(simpleSchema)),
		superValidate(request, zod(complexSchema))
	]);

	return {
		simpleForm,
		complexForm,
		user: {
			full_name: 'John Doe',
			email: 'JhonBigWings@gmail.com',
			role: 'USER'
		}
	};
}) satisfies PageServerLoad;

export const actions = {
	simple: async ({ request }) => {
		const form = await superValidate(request, zod(simpleSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		return { form };
	}
} satisfies Actions;
