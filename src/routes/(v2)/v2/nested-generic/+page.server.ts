import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { schema } from './schema.js';

export const load = async () => {
	const form = await superValidate(zod(schema), {
		defaults: { email: 'hello@21risk.com', name: 'hello-word?' }
	});

	// Always return { form } in load functions
	return { form };
};
