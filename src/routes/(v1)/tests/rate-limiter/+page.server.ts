import { RateLimiter } from 'sveltekit-rate-limiter/server';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { setFlash } from 'sveltekit-flash-message/server';
import { fail } from '@sveltejs/kit';

import type { Actions } from '@sveltejs/kit';
import { schema as contactSchema } from './schema.js';

const limiter = new RateLimiter({
	rates: {
		cookie: {
			name: 'test-rate-limiter',
			rate: [5, 'h'],
			secret: 'test-rate-limiter-secret',
			preflight: false
		}
	}
});

export const load = async (event) => {
	const form = await superValidate(event, zod(contactSchema));
	return { form };
};

export const actions: Actions = {
	contact: async (event) => {
		const form = await superValidate(event, zod(contactSchema));

		if (await limiter.isLimited(event)) {
			setFlash(
				{
					type: 'error',
					message: 'You Have Been Rate Limited, Please Try Later'
				},
				event
			);
			return fail(429, { form });
		}

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			console.log(
				'Sending email',
				form.data.name,
				form.data.email,
				form.data.subject,
				form.data.message
			);

			const response = new Response(null, { status: 502 });

			if (response.status !== 200) {
				setFlash(
					{
						type: 'error',
						message: 'Email Request Failed, Please Try Later'
					},
					event
				);
				return fail(response.status, { form });
			}
		} catch (err) {
			setFlash({ type: 'error', message: 'Error Occurred, Please Try Later' }, event);
			return fail(500, { form });
		}

		setFlash({ type: 'success', message: 'Your Email Has Been Sent' }, event);
		return { form };
	}
};
