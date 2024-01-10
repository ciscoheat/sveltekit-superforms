import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { z } from 'zod';

const schema = z.object({
	name: z.string().default('Hello world!'),
	email: z.string().email()
});

export const load = async () => {
	// Server API:
	const form = await superValidate(zod(schema));

	// Always return { form } in load and form actions.
	return { form };
};
