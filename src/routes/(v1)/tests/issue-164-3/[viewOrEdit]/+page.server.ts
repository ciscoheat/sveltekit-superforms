import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { z } from 'zod';

const schema = z.object({
	name: z.string().min(1, 'Cannot be empty')
});

export const load = async () => {
	const initialData = {
		name: 'Testing'
	};
	const form = await superValidate(initialData, zod(schema));
	console.log('🚀 ~ file: +page.server.ts:13 /issue-164-3', form);

	return { form };
};
