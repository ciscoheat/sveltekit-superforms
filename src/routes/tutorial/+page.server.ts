import { setError, superValidate } from '$lib/server';
import { z } from 'zod';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// See https://zod.dev/?id=primitives for schema syntax
const userSchema = z.object({
  id: z.number().int().positive(), // Auto-increment id
  name: z.string(),
  email: z.string().email()
});

// A simple user "database"
const userId = (function* () {
  let i = 1;
  while (true) yield i++;
})();

const users: z.infer<typeof userSchema>[] = [
  {
    id: userId.next().value,
    name: 'Important Customer',
    email: 'important@example.com'
  },
  {
    id: userId.next().value,
    name: 'Super Customer',
    email: 'super@example.com'
  }
];

// The userSchema is for the database integrity, so an id must exist there.
// But we want to use CRUD (Create, Read, Update, Delete)
// and must therefore allow id not to exist when creating users.
//
// So we extend the user schema.
const crudSchema = userSchema.extend({
  id: userSchema.shape.id.optional()
});

export const load = (async ({ url }) => {
  // READ user
  const id = parseInt(url.searchParams.get('id') ?? '0');
  const user = users.find((u) => u.id == id);

  if (id > 0 && !user) throw error(404, 'User not found.');

  const form = await superValidate(user, crudSchema);
  console.log('LOAD', form);

  return { form, users };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const form = await superValidate(event, crudSchema);
    console.log('POST', form);
    if (!form.success) return fail(400, { form });

    if (form.data.email.includes('spam')) {
      return setError(form, 'email', 'Email cannot contain spam.');
    }

    if (!form.data.id) {
      // CREATE user
      const user = { ...form.data, id: userId.next().value };
      users.push(user);

      form.data = user;
      form.message = 'User created!';
    } else {
      // UPDATE user
      const user = users.find((u) => u.id == form.data.id);
      if (!user) throw error(404, 'User not found.');

      users[users.indexOf(user)] = { ...form.data, id: user.id };
      form.message = 'User updated!';
    }

    return { form };
  }
} satisfies Actions;
