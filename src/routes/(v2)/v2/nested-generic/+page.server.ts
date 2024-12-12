import { superValidate } from '$lib/superValidate.js';
import { zod } from '$lib/adapters/zod.js';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema), {
		defaults: { email: 'hello@21risk.com', name: 'hello-word?' }
	});

	// Always return { form } in load functions
	return { form };
};
