import { superValidate } from '$lib/server';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { users, userId, userSchema } from '../users';

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

  const form = await superValidate(user, schema);
  return { form, users };
}) satisfies PageServerLoad;

///// Form actions //////////////////////////////////////////////////

export const actions = {
  default: async (event) => {
    const data = await event.request.formData();

    const form = await superValidate(data, schema);
    if (!form.valid) return fail(400, { form });

    if (!form.data.id) {
      // CREATE user
      const user = { ...form.data, id: userId() };
      users.push(user);

      form.message = 'User created!';
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
        form.message = 'User updated!';
      }
    }
    return { form };
  }
} satisfies Actions;
