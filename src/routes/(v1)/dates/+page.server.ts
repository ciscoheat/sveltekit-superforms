import type { Actions, PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import type { z } from 'zod';
import { schema, schemaToStr } from './schema.js';

export const load = (async ({ url }) => {
	//console.log('GET /dates', new Date());

	const date = new Date('1984-09-02');
	//const date = new Date(1984, 8, 2, 0, 0, 0);

	const data: z.infer<typeof schema> = {
		plain: date,
		str: date.toISOString(),
		coerced: date,
		proxy: date,
		proxyCoerce: date
	};

	const form = await superValidate<z.infer<typeof schema>>(
		url.searchParams.has('empty') ? null : data,
		zod(schema)
	);
	//console.log('load:', form.data);

	return { form, log: schemaToStr(form.data) };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request }) => {
		console.log('--- POST -------------------------------------------');
		const data = await request.formData();
		console.log(data);

		const form = await superValidate(data, zod(schema));

		console.log(form.data);

		return { form, log: schemaToStr(form.data) };
	}
} satisfies Actions;
