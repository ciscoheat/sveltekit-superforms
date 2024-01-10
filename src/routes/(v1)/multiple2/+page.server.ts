import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types.js';

const loginSchema = z.object({
	name: z.string().min(1)
});

const registerSchema = z.object({
	name: z.string().min(1)
});

export const load = async () => {
	const loginForm = await superValidate(zod(loginSchema));
	const registerForm = await superValidate(zod(registerSchema), {
		id: 'register-form'
	});

	return { loginForm, registerForm };
};

export const actions = {
	login: async ({ request }) => {
		const loginForm = await superValidate(request, zod(loginSchema));

		if (!loginForm.valid) return fail(400, { loginForm });
		return message(loginForm, 'Login form submitted');
	},
	register: async ({ request }) => {
		const registerForm = await superValidate(request, zod(registerSchema));

		if (!registerForm.valid) return fail(400, { registerForm });
		return message(registerForm, 'Register form submitted');
	}
} satisfies Actions;
