import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

import { users, userSchema } from '../users.js';

const schema = userSchema.extend({
	id: userSchema.shape.id.optional()
});

///// Load //////////////////////////////////////////////////////////

export const load = (async ({ url }) => {
	// READ user
	// For simplicity, use the id query parameter instead of a route.
	const id = url.searchParams.get('id') ?? users[0].id;
	const user = id ? users.find((u) => u.id == id) : null;

	if (id && !user) throw error(404, 'User not found.');

	const form = await superValidate(user, zod(schema));
	return { form };
}) satisfies PageServerLoad;

///// Form actions //////////////////////////////////////////////////

export const actions = {
	default: async (event) => {
		const data = await event.request.formData();
		const form = await superValidate(data, zod(schema));

		return message(form, form.valid ? 'OK' : 'Errors');
	}
} satisfies Actions;
