import type { PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { schema } from './schema.js';
import { error } from '@sveltejs/kit';
import type { z } from 'zod';

const groups = [
	{
		id: 1,
		name: 'Group 1',
		start_date: new Date(),
		end_date: new Date(),
		course_id: 10
	},
	{
		id: 2,
		name: 'Group 2',
		start_date: new Date(),
		end_date: new Date(),
		course_id: 20
	}
];

export const load: PageServerLoad = async () => {
	const account: z.infer<typeof schema> = {
		email: 'test@example.com',
		name: 'Test',
		group: [groups[0]]
	};

	if (!account) throw error(404);

	const form = await superValidate(account, zod(schema));

	return { form, groups };
};
