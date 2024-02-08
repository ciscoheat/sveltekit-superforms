import { zod } from '$lib/adapters/zod.js';
import { superValidate } from '$lib/server/index.js';
import { schema } from './schema.js';
import { VERSION, redirect } from '@sveltejs/kit';

export const load = async () => {
	const form = await superValidate(zod(schema));
	return { form };
};

export const actions = {
	default: async () => {
		if (VERSION.startsWith('2')) redirect(303, '/');
		else throw redirect(303, '/');
	}
};
