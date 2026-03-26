import { schema1, schema2 } from './schema.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

export const load = async () => {
	const [form1, form2] = await Promise.all([
		superValidate(
			{
				age: '42',
				value: '50000'
			},
			zod(schema1)
		),
		superValidate(zod(schema2))
	]);

	return { form1, form2 };
};
