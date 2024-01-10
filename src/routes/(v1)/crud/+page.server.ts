import { message, superValidate } from '$lib/server/index.js';
import { zod } from '$lib/adapters/zod.js';

import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

import { users, userId, userSchema } from '../users.js';

const schema = userSchema.extend({
	id: userSchema.shape.id.optional()
});

///// Load //////////////////////////////////////////////////////////

export const load = (async ({ url }) => {
	// READ user
	// For simplicity, use the id query parameter instead of a route.
	const id = url.searchParams.get('id');
	const user = id ? users.find((u) => u.id == id) : null;

	if (id && !user) throw error(404, 'User not found.');

	const form = await superValidate(user, zod(schema));
	return { form, users };
}) satisfies PageServerLoad;

///// Form actions //////////////////////////////////////////////////

export const actions = {
	default: async (event) => {
		const data = await event.request.formData();

		const form = await superValidate(data, zod(schema));
		if (!form.valid) return message(form, 'Invalid form');

		if (!form.data.id) {
			// CREATE user
			const user = { ...form.data, id: userId() };
			users.push(user);

			return message(form, 'User created!');
		} else {
			const user = users.find((u) => u.id == form.data.id);
			if (!user) throw error(404, 'User not found.');

			const index = users.indexOf(user);

			if (data.has('delete')) {
				// DELETE user
				users.splice(index, 1);
				throw redirect(303, '?');
			} else {
				// UPDATE user
				users[index] = { ...form.data, id: user.id };
				return message(form, 'User updated!');
			}
		}
	}
} satisfies Actions;
