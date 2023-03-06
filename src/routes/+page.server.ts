import { setError, superValidate } from '$lib/server';
import { z } from 'zod';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { redirect } from 'sveltekit-flash-message/server';
import { RateLimiter } from 'sveltekit-rate-limiter';

const limiter = new RateLimiter({
  rates: {
    IPUA: [1, 'm']
  }
});

// See https://zod.dev/?id=primitives for schema syntax
const userSchema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().min(2).regex(/^A.*$/),
  email: z
    .string()
    .email()
    .refine((email) => !email.includes('spam'), {
      message: 'Email cannot contain spam.'
    }),
  gender: z.enum(['male', 'female', 'other']).nullish()
});

// Let's worry about id collisions later
const userId = () => String(Math.random()).slice(2);

// A simple user "database"
const users: z.infer<typeof userSchema>[] = [
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
  const id = url.searchParams.get('id');
  const user = id
    ? users.find((u) => u.id == url.searchParams.get('id'))
    : null;

  if (id && !user) throw error(404, 'User not found.');

  const form = await superValidate(user, crudSchema, {
    includeMeta: true
  });
  return { form, users };
}) satisfies PageServerLoad;

export const actions = {
  edit: async (event) => {
    const data = await event.request.formData();
    console.log('POST', data);
    const form = await superValidate(data, crudSchema);
    console.log('FORM', form);
    if (!form.valid) return fail(400, { form });

    if (!(await limiter.check(event))) {
      form.valid = false;
      form.message = 'You are rate limited';
      return fail(429, { form });
    }

    //throw error(500);

    if (!form.data.id) {
      // CREATE user
      const user = { ...form.data, id: userId() };
      users.push(user);
      throw redirect(
        //'?id=' + user.id,
        {
          type: 'success',
          message: 'User created!'
        },
        event
      );
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
