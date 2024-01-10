import { actionResult, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { z } from 'zod';
import type { RequestHandler } from './$types.js';

const loginSchema = z.object({
	email: z
		.string({ required_error: 'Please enter an e-mail address.' })
		.email('Please enter an e-mail address.'),
	password: z.string().min(5)
});

export const POST = (async (event) => {
	const data = await event.request.formData();
	console.log('POST /test/login', data);
	const form = await superValidate(data, zod(loginSchema));
	console.log('FORM', form);

	//if (!form.valid) return actionResult('error', 'I AM ERROR');
	if (!form.valid) return actionResult('failure', { form });

	if (data.has('redirect')) {
		return actionResult('redirect', '/redirected', {
			message: { message: 'Redirected from; "login"', type: 'success' }
		});
	}

	form.message = 'Login successful!';
	return actionResult('success', { form });
}) satisfies RequestHandler;
