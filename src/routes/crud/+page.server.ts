import { superValidate } from '$lib/server';
import { z } from 'zod';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

///// Data model ////////////////////////////////////////////////////

// See https://zod.dev/?id=primitives for schema syntax
const userSchema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().min(2),
  email: z.string().email()
});

// Let's worry about id collisions later
const userId = () => String(Math.random()).slice(2);

type UserDB = z.infer<typeof userSchema>[];

// Set a global variable to preserve DB when Vite reloads.
const g = globalThis as unknown as { users: UserDB };

// A simple user "database"
const users: UserDB = (g.users = g.users || [
  {
    id: userId(),
    name: 'Important Customer',
    email: 'important@example.com'
  },
  {
    id: userId(),
    name: 'Super Customer',
    email: 'super@example.com'
  }
]);

const crudSchema = userSchema.extend({
  id: userSchema.shape.id.optional()
});

///// Load //////////////////////////////////////////////////////////

export const load = (async ({ url }) => {
  // READ user
  // For simplicity, use the id query parameter instead of a route.
  const id = url.searchParams.get('id');
  const user = id ? users.find((u) => u.id == id) : null;

  if (id && !user) throw error(404, 'User not found.');

  const form = await superValidate(user, crudSchema);
  return { form };
}) satisfies PageServerLoad;

///// Form actions //////////////////////////////////////////////////

export const actions = {
  default: async (event) => {
    const form = await superValidate(event, crudSchema);
    if (!form.valid) return fail(400, { form });

    if (!form.data.id) {
      // CREATE user
      const user = { ...form.data, id: userId() };
      users.push(user);

      form.message = 'User created!';
      return { form };
    } else {
      // UPDATE user
      const user = users.find((u) => u.id == form.data.id);
      if (!user) throw error(404, 'User not found.');

      users[users.indexOf(user)] = { ...form.data, id: user.id };

      form.message = 'User updated!';
      return { form };
    }
  }
} satisfies Actions;
