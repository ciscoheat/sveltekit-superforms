import { zod } from '$lib/adapters/zod.js';
import { schema } from './schema.js';
import { superValidate } from '$lib/superValidate.js';

export const load = async () => {
	const form = await superValidate(
		{
			foo: {
				name: 'Superform rocks',
				link: 'https://example.com'
			}
		},
		zod(schema)
	);
	return { form };
};
