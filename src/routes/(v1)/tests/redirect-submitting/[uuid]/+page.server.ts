import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { v4 } from 'uuid';
import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/superValidate.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const schema = z.object({
	name: z.string().min(1),
	same: z.boolean()
});

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async ({ request, url }) => {
		await sleep(500);
		const form = await superValidate(request, zod(schema));
		console.log('POST', form);

		// Convenient validation check:
		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
		}

		// TODO: Do something with the validated form.data

		// Yep, return { form } here too
		// return { form }
		throw redirect(303, form.data.same ? url.toString() : `/tests/redirect-submitting/${v4()}`);
	}
};
