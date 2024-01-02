/**
 * Fixed: https://github.com/ciscoheat/sveltekit-superforms/issues/85
 */

import type { PageServerLoad } from './$types.js';
import { superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/index.js';

import { schemaDto } from './schema.js';

export const load = (async () => {
	const form = await superValidate(null, zod(schemaDto));
	return { form };
}) satisfies PageServerLoad;
